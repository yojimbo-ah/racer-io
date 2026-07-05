import { Listener , PositionEventPayload , PositionUpdatedEvent , Subjects , userStatus } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { PositionUpdatedAchivePublisher } from "../publishers/positionUpdatedArchive";
import { Message } from "node-nats-streaming";
import redis from "../../redis";

const TIME_BEFORE_DELETE = 600 ;

export type UserData = PositionUpdatedEvent['data'] & {
    userStatus : userStatus
}

// need to use hashes here beceause the structure will kinda change beaceause will hold
// the raceId because we need it on the archiving service also 
export class PositionUpdatedListener extends Listener<PositionUpdatedEvent>{
    subject = Subjects.PositionUpdated as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: PositionUpdatedEvent['data'], msg: Message): Promise<void> {
        // this listener will just update the position and the speed of
        // the player not handeling the logique of the race

        // update the postion at redis database 
        const oldPayload = await redis.get(data.userId) ;
        let userData : UserData ;
        if (!oldPayload) {
            userData = {
                ...data ,
                userStatus : userStatus.Idle
            } ;

        } else {
            
            const payload = JSON.parse(oldPayload) as UserData ;
            userData = {
                ...data ,
                userStatus : payload.userStatus
            } ;
        }

        await redis.set(data.userId , JSON.stringify(userData) , 'EX' , TIME_BEFORE_DELETE) ;
        console.log(" got event at :" + data.timestamp) ;
        msg.ack() ;
    }
}