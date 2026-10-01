import { Listener , Subjects , UserDisConnectedEvent } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import redis from "../../redis";

export class UserDisConnectedListener extends Listener <UserDisConnectedEvent> {
    subject = Subjects.userDisConnected as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: UserDisConnectedEvent['data'] , msg: Message): Promise<void> {
        // will add the logique later
        // the user will not be set to idle directly here , 
        await redis.multi()
            .zrem('active:users', data.userId)
            .del(`user:${data.userId}`, `raceinterval:${data.userId}`)
            .exec() ;
        msg.ack() ;
    }
}
