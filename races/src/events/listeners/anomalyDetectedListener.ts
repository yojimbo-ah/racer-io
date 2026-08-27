import { Subjects , Listener , AnomalyDetectedEvent  , userStatus, RaceStatus, RaceCancelledEvent, CheaterDetectedEvent} from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import User from "../../models/user-model";
import Anomaly from "../../models/anomaly-model";
import Race from "../../models/race-model";
import CheaterDetectedPublisher from "../publishers/cheaterDetectedPublisher";
import { RaceCancelledPublisher } from "../publishers/RaceCancelledPublisher";
import { natsWrapper } from "../../nats-wrapper";
import redis from "../../redis";
import { RaceRedis } from "../../func/helper/race-functions";
import { RACE_USER_STATE_EXPIRY_TIME } from "../../../consts/expiry-times";
import mongoose, { mongo } from "mongoose";
import OutboxEvent from "../../models/outbox-model";

const WEEK_TIME = 7 * 24 * 60 * 60 * 1000
const ANOMALY_COUNT_BEFORE_DESACTIVATE = 5 ;

export class AnomalyDetectedListener extends Listener<AnomalyDetectedEvent>{
    subject = Subjects.AnomalyDetected as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: AnomalyDetectedEvent['data'] , msg: Message): Promise<void> {
        const user = await User.findById(data.userId) ;
        if (!user) {
            throw new Error('Couldnt find the user') ;
        } ;
        const weekAgo = new Date(
            Date.now() - WEEK_TIME
        );

        const count = await Anomaly.countDocuments({
            userId : data.userId,
            timestamp: {
                $gte: weekAgo
            }
        });
        if (count === ANOMALY_COUNT_BEFORE_DESACTIVATE) {
            // Cheater detected

            // publish cheater detected event
            // and save the user in this service as cheater also 

            // will changed into the oubox relay pattern
            // new CheaterDetectedPublisher(natsWrapper.client).publish(data) ;
            
            user.reason_supervision = 'Using unreal human speed' ;
            user.under_supervision = true ;

            const mongoSession = await mongoose.startSession() ;
            try {
                await mongoSession.withTransaction(async () => {
                    await user.save({session : mongoSession}) ;
                    const payload : CheaterDetectedEvent['data'] = data ;

                    await OutboxEvent.build({
                        eventType : Subjects.CheaterDetected ,
                        payload
                    }).save() ;
                })
            } catch (err) {
                console.log('error happened' + err) ;
            } finally {
                await mongoSession.endSession() ;
            }

            // cheacking if the user is in race

            const userStat = await redis.hget(data.userId , 'userStatus') ;
            if (userStat === userStatus.Idle) {
                return ;
            } else if (userStat === userStatus.awaitingRace) {
                // case of waiting race we just cancel stop the race before it 
                // starts

                // still didnt create it yet chance of happening
                // very low 


            } else if (userStat === userStatus.InRace) {
                // stop the race and save it in the databse as the race cancelled
                const raceId = await redis.hget(data.userId , 'raceId') ;
                // first cancell the race 
                // remove it from active races in the redis db
                // trigger a race cancelled for the positions service to notify
                const raceData = await redis.get(`race:started:${raceId}`) ;
                if (!raceData || !raceId) {
                    return ;
                }
                const race = JSON.parse(raceData) as RaceRedis ;

                const pipeline = redis.pipeline() ;
                pipeline.hset(race.user1 , {
                    userStatus : userStatus.Idle ,
                    raceId : ''
                }) ;
                pipeline.hset(race.user2 , {
                    userStatus : userStatus.Idle ,
                    raceId : ''
                }) ;
                pipeline.expire(race.user1 , RACE_USER_STATE_EXPIRY_TIME) ;
                pipeline.expire(race.user2 , RACE_USER_STATE_EXPIRY_TIME) ;
                pipeline.del(`race:started:${raceId}`) ;
                pipeline.srem(`races:active` , raceId) ;

                await pipeline.exec() ;

                // the race data has been removed now it need to be saved
                // in the databse and publish the event
                const raceRecord = await Race.findById(raceId) ;
                if (!raceRecord) {
                    throw Error('Couldnt find the right data of the race') ;
                } ;
                raceRecord.raceStatus = RaceStatus.RaceCancelled ;
                const mongoSession = await mongoose.startSession() ;
                try {
                    // use the transcation so both transcations 
                    // happen together
                    await mongoSession.withTransaction(async () => {
                        await raceRecord.save({session : mongoSession}) ;
                        const payload : RaceCancelledEvent['data'] = {
                            race : {
                                endPosition : race.endingPos ,
                                startPos : race.startingPos ,
                                raceId : raceId ,
                                raceStatus : RaceStatus.RaceCancelled
                            } ,
                            userData : {
                                user1 : race.user1 ,
                                user2 : race.user2
                            }
                        }
                        await OutboxEvent.build({
                            eventType : Subjects.RaceCancelled ,
                            payload
                        }).save() ;
                    })
                } finally {
                    await mongoSession.endSession() ;
                }

            }

        } ;

        if (count > ANOMALY_COUNT_BEFORE_DESACTIVATE) {
            throw new Error('Account desactivated') ;
        } ;
        const anomaly = Anomaly.build(data) ;
        await anomaly.save() ;

        msg.ack() ;
    }
}