import type { PositionEventPayload , Position } from "@racer-io/common"
import PositionUpdatedPublisher from "../../events/publishers/PositionUpdatedPublisher"
import redis from "../../redis";
import { natsWrapper } from "../../nats-wrapper";
import { positionRateLimiter } from "../../rate-limiters/positionRateLimiter";
import { anomalyDetection } from "../helper/anomalyDetection";
export type PositionString = {
    longitude : string ,
    latitude : string
} ;

// need to improve the cheeting detecting algorithm and attatch it to redis 
// will work on it on the future 

// the algorithm will keep the last 4 positions in the database and each 
// time will see if there is anomaly between them and save the anomaly count in
// expiry field inside a hset after that and if we reach a high number of 
// anomalys in small intervall then we will detect cheater 

// and publish a cheater detected event for other services

export const positionUpdatedSocket = async (payload : PositionEventPayload , userId : string) => {
    try {
        await positionRateLimiter.consume(userId) ;
    } catch (err) {
        console.log('reached the max updates per second') ;
        return ;
    }

    try {
    // will be used later so we can know users around the user who sent the request
    // plus the users who are currently online
    
    // we need to add a test for users if the gps is tweking or not 
    // or weither they are cheating so we will calulate there speec and compare it the 
    // the fastest human speed
    await anomalyDetection(userId , payload.timestamp) ;

    const stringPayload = JSON.stringify({
        timestamp : payload.timestamp ,
        latitude : payload.y ,
        longitude : payload.x
    })
    const pipeline = redis.pipeline() ; // using pipeline so nothing is out of sync
    pipeline.geoadd('active:users' , payload.x , payload.y , userId) ;
    pipeline.lpush(`raceinterval:${userId}` , stringPayload) ; // used for anomaly cheacking later
    pipeline.ltrim(`raceinterval:${userId}` , 0 , 4) ; // trims and keeps only the last 5 postions with there timestamps
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