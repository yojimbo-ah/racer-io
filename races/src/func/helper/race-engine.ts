import { getRaces , getRace , getUserPosition  } from "./race-functions";
import { distanceBetween } from "../inRegion";
import { RaceFinishedPublisher } from "../../events/publishers/raceEndedPublisher";
import { natsWrapper } from "../../nats-wrapper";
import Race from "../../models/race-model";
import { RaceStatus , userStatus } from "@racer-io/common";
import redis from "../../redis";
import { RACE_USER_STATE_EXPIRY_TIME } from "../../../consts/expiry-times";

const RADIUS_TO_FINISH_POINT = 200 ; // this metric is in meters 

const raceEngine = async (checking : boolean) : Promise<void> => {
    checking = true ;
    const races = await getRaces() ;
    console.log(races) ;
    if (races) {
        const racesPromise = races.map(async (raceId) => {
            try {
                console.log('am here') ;
                const race = await getRace(raceId) ;
                const user1 = await getUserPosition(race.user1) ;
                const user2 = await getUserPosition(race.user2) ;
                const l1 = distanceBetween(user1 , race.endingPos) ;
                const l2 = distanceBetween(user2 , race.endingPos) ;
                // check if one of the user reach the ending position 
                // publishing to the archive service so we can archive the user data
                // maybe i fix the event payload for now
                if (l1 > RADIUS_TO_FINISH_POINT && l2 > RADIUS_TO_FINISH_POINT) return ;
                    const raceRecord = await Race.findById(raceId) ;
                    if (!raceRecord) {
                        throw new Error('Couldnt find the race in database') ; 
                    }

                    if (l2 > l1) {
                        // user1 won
                        raceRecord.winner = race.user1 ;
                        await raceRecord.save() ;
                        new RaceFinishedPublisher(natsWrapper.client).publish({
                            race : {
                                endPosition : race.endingPos ,
                                startPos : race.endingPos ,
                                raceId : raceRecord._id.toString() ,
                                raceStatus : RaceStatus.RaceEnded
                            } ,
                            userData : {
                                winner : race.user1 ,
                                user1 : race.user1 ,
                                user2 : race.user2
                            }
                        }) ;
                    } else {
                        // user2 won
                        raceRecord.winner = race.user2 ;
                        await raceRecord.save() ;
                        new RaceFinishedPublisher(natsWrapper.client).publish({
                            race : {
                                endPosition : race.endingPos ,
                                startPos : race.endingPos ,
                                raceId : raceRecord._id.toString() ,
                                raceStatus : RaceStatus.RaceEnded
                            } ,
                            userData : {
                                winner : race.user2 ,
                                user1 : race.user1 ,
                                user2 : race.user2
                            }
                        }) ;
                    }
                    // setting the status of the user to idle 
                    // after finishing the race
                    await redis.hset(race.user1 , {userStatus : userStatus.Idle , raceId : ''}) ;
                    await redis.expire(race.user1 , RACE_USER_STATE_EXPIRY_TIME) ;
                    await redis.hset(race.user2 , {userStatus : userStatus.Idle , raceId : ''}) ;
                    await redis.expire(race.user2 , RACE_USER_STATE_EXPIRY_TIME) ;
                    await redis.del(`race:started:${raceRecord._id.toString()}`) ;
                    await redis.srem('races:active' , raceRecord._id.toString()) ;

            } catch (err) {
                console.log(err);
                console.log('Couldnt treat the race') ;
                // probably will add a race cancelled logique here later
            }

        })
        await Promise.all(racesPromise) ;
    }
}

export default raceEngine ;