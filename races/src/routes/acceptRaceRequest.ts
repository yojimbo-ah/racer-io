// this route is for the user to accept or deny the race request being sent to him
// more details will be added later

// for more details why use the 0 and 1 index in the users array currently
// go back to the models/user-model.ts

import express , { Request , Response , NextFunction } from "express";
import { body } from "express-validator";
import { validateRequest , RaceStatus, userStatus, RaceStartedEvent, Subjects, RaceCancelledEvent, BadRequestError } from "@racer-io/common";
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

            // only one request is allowed to transition the race out of the
            // awaiting state, this prevents a second accept/deny racing in
            if (race.raceStatus !== RaceStatus.RaceAwaiting) {
                throw new BadRequestError('The race is no longer waiting for a decision') ;
            }

            if (accept) {
                // start a new race in the database
                // the use of transaction to make sure both operations 
                // happen and also the publish will be automatic 
                const mongoSession = await mongoose.startSession() ;
                try {
                    const startedRace = await mongoSession.withTransaction(async () => {
                        // atomically claim the transition so concurrent
                        // accept-race requests only let one of them through
                        const claimed = await Race.findOneAndUpdate(
                            { _id : raceId , raceStatus : RaceStatus.RaceAwaiting } ,
                            { $set : { raceStatus : RaceStatus.RaceStared } } ,
                            { session : mongoSession , new : true }
                        ) ;
                        if (!claimed) {
                            throw new BadRequestError('The race was already decided') ;
                        }
                        const payload : RaceStartedEvent['data'] = {
                            race : {
                                endPosition : claimed.endingPos ,
                                startPos : claimed.startPos ,
                                raceId : claimed._id.toString() ,
                                raceStatus : RaceStatus.RaceStared
                            } ,
                            userData : {
                                user1 : claimed.users[0] ,
                                user2 : claimed.users[1]
                            }
                        }
                        await OutboxEvent.build({
                            eventType : Subjects.RaceStarted ,
                            payload,
                            traceCarrier: (req as any)._traceCarrier
                        }).save({session : mongoSession}) ;
                        return claimed ;
                    } , { timeoutMS : 10_000 }) ;

                    const pipeline = redis.pipeline() ;
                    // create a new race in reddis database under race:started:raceId
                    pipeline.set(`race:started:${startedRace._id.toString()}` , JSON.stringify({
                        user1 : startedRace.users[0] ,
                        user2 : startedRace.users[1] ,
                        startingPos : startedRace.startPos ,
                        endingPos : startedRace.endingPos ,
                        // saved so the race engine can publish the race:finished event
                        // in the same trace as the request that started the race
                        traceCarrier : (req as any)._traceCarrier ?? {}
                    }) , 'EX' , RACE_STARTED_EXPIRY_TIME) ;
                    
                    // saving the race into the set of active races (so it can be treated later)

                    // the use of pipeline for intergrity
                    pipeline.sadd('races:active' , startedRace._id.toString()) ;

                    pipeline.hset(startedRace.users[0] , {userStatus : userStatus.InRace , raceId : startedRace._id.toString()}) ;
                    pipeline.expire(startedRace.users[0] , RACE_USER_STATE_EXPIRY_TIME) ;
                    pipeline.hset(startedRace.users[1] , {userStatus : userStatus.InRace , raceId : startedRace._id.toString()}) ;
                    pipeline.expire(startedRace.users[1] , RACE_USER_STATE_EXPIRY_TIME) ;

                    await pipeline.exec() ;
                    res.status(200).json({message : "start running" , accepted : true})
                } finally {
                    await mongoSession.endSession() ;
                }
            } else {

                // cancell the current race in the database
                const mongoSession = await mongoose.startSession() ;
                try {
                    await mongoSession.withTransaction(async () => {
                        // atomically claim the transition so only one request
                        // can cancel the race
                        const claimed = await Race.findOneAndUpdate(
                            { _id : raceId , raceStatus : RaceStatus.RaceAwaiting } ,
                            { $set : { raceStatus : RaceStatus.RaceCancelled } } ,
                            { session : mongoSession , new : true }
                        ) ;
                        if (!claimed) {
                            throw new BadRequestError('The race was already decided') ;
                        }
                        const payload : RaceCancelledEvent['data'] = {
                            race : {
                                endPosition : claimed.endingPos ,
                                startPos : claimed.startPos ,
                                raceId : claimed._id.toString() ,
                                raceStatus : RaceStatus.RaceCancelled
                            } ,
                            userData : {
                                user1 : claimed.users[0] ,
                                user2 : claimed.users[1]
                            }
                        }
                        await OutboxEvent.build({
                            eventType : Subjects.RaceCancelled ,
                            payload,
                            traceCarrier: (req as any)._traceCarrier
                        }).save({session : mongoSession}) ;
                    } , { timeoutMS : 10_000 }) ;

                    res.status(200).json({message : "race cancelled" , accepted : false}) ;
                } finally {
                    await mongoSession.endSession() ;
                }

            }

        }
    }
)

export {router as acceptRaceRequestRouter} ;