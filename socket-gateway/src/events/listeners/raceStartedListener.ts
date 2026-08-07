import { Listener ,  RaceStartedEvent , Subjects } from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import { getIO } from "../../socket.io";


export class RaceStartedListener extends Listener<RaceStartedEvent> {
    subject = Subjects.RaceStarted as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceStartedEvent['data'] , msg: Message): Promise<void> {
        // will have to do something with the client feedback here 
        const io = getIO() ;

        io.to(`user:${data.userData.user1}`).emit('race_started' , data) ;
        msg.ack() ;
    }
}