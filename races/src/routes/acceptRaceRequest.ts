// this route is for the user to accept or deny the race request being sent to him
// more details will be added later


import express , { Request , Response , NextFunction } from "express";
import { body } from "express-validator";
import { validateRequest , RaceStatus } from "@racer-io/common";
import redis from "../redis";
import Race from "../models/race-model";
import { RaceStartedPublisher } from "../events/publishers/raceStartedPublisher";
import { RaceCancelledPublisher } from "../events/publishers/RaceCancelledPublisher";
import { natsWrapper } from "../nats-wrapper";


const RACE_EXPIRY_TIME = 360000 ; // 1 hour

const router = express.Router() ;

router.post('/api/races/accept-race' ,
    [
        body('raceId').isString() ,
        body('accept').isBoolean()
    ] ,
    validateRequest ,
    async (req : Request, res : Response , next : NextFunction) => {
        const {raceId , accept} = req.body ;
        const redisPayloadString = await redis.get(`race:await:${raceId}`) ;
        if (!redisPayloadString) {
            // if there isnt no match in the redis database then 
            // the time period of waiting has finished ( still didnt do it)
            throw new Error('Error happened , The race either finished or doesnt exists') ;

        } else {
            // if it was defined then the the reply was in the time period 
            // so we create the race and change it status and stuff like 
            const race = await Race.findById(raceId) ;
            if (!race) {
                throw new Error('Couldnt find the right data') ;
            }

            if (accept) {
                // start a new race in the database
                race.raceStatus = RaceStatus.RaceStared

                // create a new race in reddis database under race:started:raceId
                await redis.set(`race:started:${race._id.toString()}` , JSON.stringify({
                    user1 : race.user1 ,
                    user2 : race.user2 ,
                    startingPos : race.startPos ,
                    endingPos : race.endingPos 
                }) , 'EX' , RACE_EXPIRY_TIME) ;
                
                // saving the race into the set of active races (so it can be treated later)
                await redis.sadd('races:active' , race._id.toString()) ;
                new RaceStartedPublisher(natsWrapper.client).publish({
                    race : {
                        endPosition : race.endingPos ,
                        startPos : race.startPos ,
                        raceId : race._id.toString() ,
                        raceStatus : RaceStatus.RaceStared
                    } ,
                    userData : {
                        user1 : race.user1 ,
                        user2 : race.user2
                    }
                }) ;

                res.status(200).json({message : "start running" , accepted : true})
            } else {

                // cancell the current race in the database
                race.raceStatus = RaceStatus.RaceCancelled ;

                new RaceCancelledPublisher(natsWrapper.client).publish({
                    race : {
                        endPosition : race.endingPos ,
                        startPos : race.startPos ,
                        raceId : race._id.toString() ,
                        raceStatus : RaceStatus.RaceCancelled
                    } ,
                    userData : {
                        user1 : race.user1 ,
                        user2 : race.user2
                    }
                })
            }

            await race.save() ;
            res.status(200).json({message : "race cancelled" , accepted : false})
        }
        

    }
)

export {router as acceptRaceRequestRouter} ;