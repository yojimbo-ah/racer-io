import { Listener ,  RaceStartedEvent , RaceStatus, Subjects , userStatus} from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import redis from "../../redis";
import { getIO } from "../../socket.io";


export class RaceStartedListener extends Listener<RaceStartedEvent> {
    subject = Subjects.RaceStarted as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceStartedEvent['data'] , msg: Message): Promise<void> {
        // will have to do something with the client feedback here 
        const io = getIO() ;
        await redis.hset(`user:${data.userData.user1}` , {
            status : userStatus.InRace
        }) ;
        await redis.hset(`user:${data.userData.user2}` , {
            status : userStatus.InRace
        }) ;

        io.to(`user:${data.userData.user1}`).emit('race_started' , data) ;
        msg.ack() ;
    }
}