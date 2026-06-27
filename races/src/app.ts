import express from "express" ;
import 'express-async-errors';
import {NotFoundError , errorHandler , currentUser , requireAuth , RaceStatus, userStatus} from "@racer-io/common"
import { newRouter } from "./routes/new";
import { acceptRaceRequestRouter } from "./routes/acceptRaceRequest";
import { getRaces , getRace , getUserPosition , getUserLengthFromPos } from "./func/helper/race-functions";
import Race from "./models/race-model";
import { RaceFinishedPublisher } from "./events/publishers/raceEndedPublisher";
import { natsWrapper } from "./nats-wrapper";
import redis from "./redis";

const TIME_BETWEEN_RACES_CHECKS = 20000 // 10S
const RADIUS_TO_FINISH_POINT = 1 ;

const app = express() ;

app.set('trust proxy' , true) ;
app.use(express.json()) ;
app.use(currentUser) ;
app.use(requireAuth) ;
app.use(newRouter) ;
app.use(acceptRaceRequestRouter) ;

// now we have to create a mechanisam that check for running races
// and check the two players is one of them close to either position

// this logique will be moved from the app.ts file 
// just for testing purposes and to make sure it will
// even work with this appraoch 

// this is a loop interval that runs every period
// check the status of every running race
let checking = false ;

setInterval(async () => {
    if (checking)  return ;
    try {
        checking = true ;
        const races = await getRaces() ;
        if (races) {
            const racesPromise = races.map(async (raceId) => {
                try {
                    const race = await getRace(raceId) ;
                    const user1 = await getUserPosition(race.user1) ;
                    const user2 = await getUserPosition(race.user2) ;
                    const l1 = getUserLengthFromPos(user1 , race.endingPos) ;
                    const l2 = getUserLengthFromPos(user2 , race.endingPos) ;
                    // check if one of the user reach the ending position 
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

                        user1.userStatus = userStatus.Idle ;
                        user2.userStatus = userStatus.Idle ;    
                        await redis.set(race.user1 , JSON.stringify(user1) , 'EX' , 3600) ;
                        await redis.set(race.user2 , JSON.stringify(user2) , 'EX' , 3600) ;
                        await redis.del(`race:started:${raceRecord._id.toString()}`) ;

                } catch (err) {
                    console.log(err);
                    console.log('Couldnt treat the race') ;
                    // probably will add a race cancelled logique here later
                }
    
            })
            await Promise.all(racesPromise) ;
        }
    } finally {
        checking = false ;
    }

} , TIME_BETWEEN_RACES_CHECKS) ;

app.all('*' , async () => {
    throw new NotFoundError() ;
})
app.use(errorHandler) ; 

export  {app} ;