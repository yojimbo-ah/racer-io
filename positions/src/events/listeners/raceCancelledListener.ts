import { Listener , Subjects , RaceCancelledEvent, Position, RaceStatus, userStatus } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import { getIO } from "../../socket.io";
import redis from "../../redis";

export class RaceCancelledListener extends Listener<RaceCancelledEvent> {
    queueGroupName = queueGroupName ;
    subject = Subjects.RaceCancelled as const ;
    async onMessage(data: RaceCancelledEvent['data'], msg: Message): Promise<void> {
        const io = getIO() ;
        
        await redis.hset(`user:${data.userData.user1}` , {status : userStatus.Idle}) ;
        await redis.hset(`user:${data.userData.user2}` , {status : userStatus.Idle}) ;
        // the request will be sent to the first user beceuase the second user is 
        // the one going to acccept it 
        io.to(`user:${data.userData.user1}`).emit('race_cancelled' , data) ;
        io.to(`user:${data.userData.user2}`).emit('race_cancelled' , data) ;
        msg.ack() ;
    }
}