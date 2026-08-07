import { Listener , Subjects , RaceFinishedEvent  } from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";

import { getIO } from "../../socket.io";

export class RaceFinishedListener extends Listener<RaceFinishedEvent> {
    subject = Subjects.RaceFinished as const ;
    queueGroupName = queueGroupName; 
    async onMessage(data: RaceFinishedEvent['data'] , msg: Message): Promise<void> {
        // will have to do something with the client feedback here 
        const io = getIO() ;

        io.to(`user:${data.userData.user1}`).emit('race_finished' , data) ;
        io.to(`user:${data.userData.user2}`).emit('race_finished' , data) ;
        msg.ack() ;
    }
}