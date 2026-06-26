import { Listener , Subjects , RaceCancelledEvent, Position, RaceStatus } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import { getIO } from "../../socket.io";

export class RaceCancelledListener extends Listener<RaceCancelledEvent> {
    queueGroupName = queueGroupName ;
    subject = Subjects.RaceCancelled as const ;
    async onMessage(data: RaceCancelledEvent['data'], msg: Message): Promise<void> {
        const io = getIO() ;
        
        // the request will be sent to the first user beceuase the second user is 
        // the one going to acccept it 
        io.to(`user:${data.userData.user1}`).emit('start_race' , data) ;
        msg.ack() ;
    }
}