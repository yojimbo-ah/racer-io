import { Subjects , Listener , AnomalyDetectedEvent  , userStatus, RaceStatus} from "@racer-io/common";
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

const WEEK_TIME = 7 * 24 * 60 * 60 * 1000
const ANOMALY_COUNT_BEFORE_DESACTIVATE = 5 ;

export class AnomalyDetectedListener extends Listener<AnomalyDetectedEvent>{
    subject = Subjects.AnomalyDetected as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: AnomalyDetectedEvent['data'] , msg: Message): Promise<void> {
        // still dont know what to do when anomaly is triggered
        // currently is just a anomaly counter it simple setup
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
            // still didnt create it 
            // and save the user in this service as cheater also 
            new CheaterDetectedPublisher(natsWrapper.client).publish(data) ;
            user.reason_supervision = 'Using unreal human speed' ;
            user.under_supervision = true ;
            await user.save() ;
            // cheacking if the user is in race

            const userStat = await redis.hget(data.userId , 'userStatus') ;
            if (userStat === userStatus.Idle) {
                return ;
            } else if (userStat === userStatus.awaitingRace) {
                // case of waiting race we just cancel stop the race before it 
                // starts
                
                // still didnt create it yet

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
                pipeline.hset(race.user1 , {}) ;
                pipeline.hset(race.user2 , {}) ;
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
                await raceRecord.save() ;
                new RaceCancelledPublisher(natsWrapper.client).publish({
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
                })

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