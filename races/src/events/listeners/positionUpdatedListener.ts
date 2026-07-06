import { Listener , PositionEventPayload , PositionUpdatedEvent , Subjects , userStatus } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { PositionUpdatedAchivePublisher } from "../publishers/positionUpdatedArchive";
import { Message } from "node-nats-streaming";
import redis from "../../redis";

const TIME_BEFORE_DELETE = 600 ;

export type UserData = PositionUpdatedEvent['data'] & {
    userStatus : string  ,
    raceId ?: string
}

export type UserDataString = {
    userStatus : string ,
    raceId ?: string ,
    longitude : string ,
    latitude : string ,
    userId : string ,
    timestamp : string
}

// ALERT
// need to use hashes here beceause the structure will kinda change beaceause will hold
// the raceId because we need it on the archiving service also 

export class PositionUpdatedListener extends Listener<PositionUpdatedEvent>{
    subject = Subjects.PositionUpdated as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: PositionUpdatedEvent['data'], msg: Message): Promise<void> {
        // this listener will just update the position and the speed of
        // the player not handeling the logique of the race

        // update the postion at redis database 
        const exist = await redis.exists(data.userId) ;
        if (exist) {
            await redis.hset(data.userId , {
                latitude : data.latitude ,
                longitude : data.longitude ,
                timestamp : data.timestamp ,
            }) ;
            const raceId = await redis.hget(data.userId , 'raceId') ;
            // may augment the checl later
            if (raceId) {
                // user already logged in before and he is in race
                new PositionUpdatedAchivePublisher(this.client).publish({
                    latitude : data.latitude ,
                    longitude : data.longitude ,
                    timestamp : data.timestamp ,
                    userId : data.userId ,
                    raceId : raceId 
                })                
            }

        } else {
            await redis.hset(data.userId , {
                latitude : data.latitude ,
                longitude : data.longitude ,
                timestamp : data.timestamp ,
                userStatus : userStatus.Idle ,
                raceId : ''
            }) ;

        }
        // the case where the user is not in race or the user just logged in the application 
        new PositionUpdatedAchivePublisher(this.client).publish({
            latitude : data.latitude ,
            longitude : data.longitude ,
            timestamp : data.timestamp ,
            userId : data.userId ,
            raceId : ''
        }) ;

        await redis.expire(data.userId , TIME_BEFORE_DELETE) ;
        console.log(" got event at :" + data.timestamp) ;
        msg.ack() ;
    }
}