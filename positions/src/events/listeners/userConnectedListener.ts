import { Listener , Subjects , UserConnectedEvent , userStatus} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import redis from "../../redis";

export class UserConnectedListener extends Listener <UserConnectedEvent> {
    subject = Subjects.userConnected as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: UserConnectedEvent['data'] , msg: Message): Promise<void> {
        // will add the logique later
        // first must check if the user had lost connecting due to bad 
        // connection and check the current status of the user he might be in race 

        // else the user will start at idle position without starting position of 
        // course until he starts omiting data 
        const status = await redis.hget(`user:${data.userId}` , 'status') ;
        if (status && status === userStatus.InRace) {
            await redis.hset(`user:${data.userId}` , {
                status : userStatus.InRace
            }) ;
        } else {
            await redis.hset(`user:${data.userId}` , {
                status : userStatus.Idle
            }) ;
        }

        msg.ack() ;
    }
}