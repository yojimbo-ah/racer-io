// this route is for the user to accept or deny the race request being sent to him
// more details will be added later

// for more details why use the 0 and 1 index in the users array currently
// go back to the models/user-model.ts

import express , { Request , Response , NextFunction } from "express";
import { body } from "express-validator";
import { validateRequest , RaceStatus, userStatus, RaceStartedEvent, Subjects, RaceCancelledEvent } from "@racer-io/common";
import redis from "../redis";
import Race from "../models/race-model";
import { RACE_STARTED_EXPIRY_TIME, RACE_USER_STATE_EXPIRY_TIME } from "../../consts/expiry-times";
import mongoose from "mongoose";
import OutboxEvent from "../models/outbox-model";


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
                // the use of transaction to make sure both operations 
                // happen and also the publish will be automatic 
                race.raceStatus = RaceStatus.RaceStared
                const mongoSession = await mongoose.startSession() ;
                try {
                    await mongoSession.withTransaction(async () => {
                        await race.save({session : mongoSession}) ;
                        const payload : RaceStartedEvent['data'] = {
                            race : {
                                endPosition : race.endingPos ,
                                startPos : race.startPos ,
                                raceId : race._id.toString() ,
                                raceStatus : RaceStatus.RaceStared
                            } ,
                            userData : {
                                user1 : race.users[0] ,
                                user2 : race.users[1]
                            }
                        }
                        await OutboxEvent.build({
                            eventType : Subjects.RaceStarted ,
                            payload,
                            traceCarrier: (req as any)._traceCarrier
                        }).save({session : mongoSession}) ;
                    })
                } finally {
                    await mongoSession.endSession() ;
                }

                const pipeline = redis.pipeline() ;
                // create a new race in reddis database under race:started:raceId
                pipeline.set(`race:started:${race._id.toString()}` , JSON.stringify({
                    user1 : race.users[0] ,
                    user2 : race.users[1] ,
                    startingPos : race.startPos ,
                    endingPos : race.endingPos 
                }) , 'EX' , RACE_STARTED_EXPIRY_TIME) ;
                
                // saving the race into the set of active races (so it can be treated later)

                // the use of pipeline for intergrity
                pipeline.sadd('races:active' , race._id.toString()) ;

                pipeline.hset(race.users[0] , {userStatus : userStatus.InRace , raceId : race._id.toString()}) ;
                pipeline.expire(race.users[0] , RACE_USER_STATE_EXPIRY_TIME) ;
                pipeline.hset(race.users[1] , {userStatus : userStatus.InRace , raceId : race._id.toString()}) ;
                pipeline.expire(race.users[1] , RACE_USER_STATE_EXPIRY_TIME) ;

                await pipeline.exec() ;
                res.status(200).json({message : "start running" , accepted : true})
            } else {

                // cancell the current race in the database
                race.raceStatus = RaceStatus.RaceCancelled ;

                const mongoSession = await mongoose.startSession() ;
                try {
                    await mongoSession.withTransaction(async () => {
                        await race.save({session : mongoSession}) ;
                        const payload : RaceCancelledEvent['data'] = {
                            race : {
                                endPosition : race.endingPos ,
                                startPos : race.startPos ,
                                raceId : race._id.toString() ,
                                raceStatus : RaceStatus.RaceCancelled
                            } ,
                            userData : {
                                user1 : race.users[0] ,
                                user2 : race.users[1]
                            }
                        }
                        await OutboxEvent.build({
                            eventType : Subjects.RaceCancelled ,
                            payload,
                            traceCarrier: (req as any)._traceCarrier
                        }).save({session : mongoSession}) ;
                    })
                } finally {
                    await mongoSession.endSession() ;
                }

                res.status(200).json({message : "race cancelled" , accepted : false}) ;
            }

            await race.save() ;

        }
    }
)

export {router as acceptRaceRequestRouter} ;