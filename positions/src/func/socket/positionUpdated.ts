import type { PositionEventPayload , Position} from "@racer-io/common"
import PositionUpdatedPublisher from "../../events/publishers/PositionUpdatedPublisher"
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
    const oldPos  = await redis.geopos('active:users' , userId) ;
    const timestamp = await redis.hget(`user:${userId}` , 'timestamp') ;
    if (oldPos && timestamp) {
        // if there is no old payload then then this is the first time the user is logged in
        const pos : PositionStamp = {
            longitude : Number(oldPos[0]) ,
            latitude : Number(oldPos[1]) ,
            timestamp 
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
        }
    } ;

    await redis.geoadd('active:users' , payload.x , payload.y , userId) ; // saving  everything into geaspatial group
    await redis.hset(`user:${userId}` , {
        timestamp : payload.timestamp
    }) ;

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