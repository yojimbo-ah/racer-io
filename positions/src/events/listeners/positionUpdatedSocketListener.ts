import { Listener , PositionUpdatedSocketEvent , Subjects } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import { anomalyDetection } from "../../func/helper/anomalyDetection";
import redis from "../../redis";
import PositionUpdatedPublisher from "../publishers/PositionUpdatedPublisher";
import { RACE_INTERVAL_EXPIRY_TIME } from "../../../consts/expiry-times";

export class PositionUpdatedSocketListener extends Listener<PositionUpdatedSocketEvent> {
    subject = Subjects.PositionUpdatedSocket as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: PositionUpdatedSocketEvent['data'], msg: Message): Promise<void> {
        // switch the logique in the listnener to here 
        const userId = data.userId ;
        try {
            // will be used later so we can know users around the user who sent the request
            // plus the users who are currently online
            
            // we need to add a test for users if the gps is tweking or not 
            // or weither they are cheating so we will calulate there speec and compare it the 
            // the fastest human speed
            await anomalyDetection(data.userId , data.timestamp) ;

            const stringPayload = JSON.stringify({
                timestamp : data.timestamp ,
                latitude : data.latitude ,
                longitude : data.longitude
            })
            const pipeline = redis.pipeline() ; // using pipeline so nothing is out of sync
            pipeline.geoadd('active:users' , data.longitude , data.latitude , userId) ;
            pipeline.lpush(`raceinterval:${userId}` , stringPayload) ; // used for anomaly cheacking later
            pipeline.ltrim(`raceinterval:${userId}` , 0 , 4) ; // trims and keeps only the last 5 postions with there timestamps
            pipeline.expire(`raceinterval:${userId}` , RACE_INTERVAL_EXPIRY_TIME) ;
            pipeline.hset(`user:${userId}` , {
                timestamp : data.timestamp ,
                latitude : data.latitude ,
                longitude : data.longitude
            }) ;
            await pipeline.exec() ;


            new PositionUpdatedPublisher(this.client).publish(data) ;

            } catch (err) {
                console.log('updating position failed becauese of the current coardinates system we used')
            }

    }
}
