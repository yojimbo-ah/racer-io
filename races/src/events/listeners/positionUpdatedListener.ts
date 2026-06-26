import { Listener , PositionEventPayload , PositionUpdatedEvent , Subjects , userStatus } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import redis from "../../redis";

const TIME_BEFORE_DELETE = 600 ;

export type UserData = PositionEventPayload & {
    userStatus : userStatus
}


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
                ...data.positionPayload ,
                userStatus : userStatus.Idle
            } ;

        } else {
            
            const payload = JSON.parse(oldPayload) as UserData ;
            userData = {
                ...data.positionPayload ,
                userStatus : payload.userStatus
            } ;
        }

        await redis.set(data.userId , JSON.stringify(userData) , 'EX' , TIME_BEFORE_DELETE) ;
        console.log(" got event at :" + data.positionPayload.timestamp + `with speed : ${data.positionPayload.speed}`) ;
        msg.ack() ;
    }
}