import type { PositionEventPayload , Position } from "@racer-io/common"
import PositionUpdatedPublisher from "../../events/publishers/PositionUpdatedPublisher"
import AnomalyDetectedPublisher from "../../events/publishers/AnomalyDetectedPublisher";
import redis from "../../redis";
import { natsWrapper } from "../../nats-wrapper";
import { time } from "node:console";
import { calculateSpeed, PositionStamp } from "../helper/length";

export type PositionString = {
    longitude : string ,
    latitude : string
} ;

const FASTEST_HUMAN_SPEED = 9 // in m/s

export const positionUpdatedSocket = async (payload : PositionEventPayload , userId : string) => {
    try {
    // will be used later so we can know users around the user who sent the request
    // plus the users who are currently online
    
    // we need to add a test for users if the gps is tweking or not 
    // or weither they are cheating so we will calulate there speec and compare it the 
    // the fastest human speed
    const user = await redis.hgetall(`user:${userId}`) ;
    if (user && Object.keys(user).length > 0) {
        // if there is no old payload then then this is the first time the user is logged in
        const pos : PositionStamp = {
            longitude : Number(user.longitude) ,
            latitude : Number(user.latitude) ,
            timestamp : user.timestamp
        } ;
        const newPos : PositionStamp = {
            longitude : payload.x ,
            latitude : payload.y ,
            timestamp : payload.timestamp
        } 
        // calculate the speed and check the logique 
        const speed = calculateSpeed(pos , newPos) ;
        // compare the speed 
        if (speed > FASTEST_HUMAN_SPEED) {
            // save the anomaly to either the mongodb or redis db 
            new AnomalyDetectedPublisher(natsWrapper.client).publish({
                reason : 'gps tweaking , or cheating' ,
                timestamp : payload.timestamp ,
                userId 
            }) ;
            // will upgrade the logique currently will keep it simple
            return ;
        }
    } ;
    const pipeline = redis.pipeline() ; // using pipeline so nothing is out of sync
    pipeline.geoadd('active:users' , payload.x , payload.y , userId) ;
    pipeline.hset(`user:${userId}` , {
        timestamp : payload.timestamp ,
        latitude : payload.y ,
        longitude : payload.x
    }) ;
    await pipeline.exec() ;


    new PositionUpdatedPublisher(natsWrapper.client).publish({
        longitude : payload.x ,
        latitude : payload.y ,
        timestamp : payload.timestamp ,
        userId : userId ,
    }) ;

    } catch (err) {
        console.log('updating position failed becauese of the current coardinates system we used')
    }

}