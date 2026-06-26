import { Listener , Subjects , RaceAwaitingEvent, Position, RaceStatus } from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import { getIO } from "../../socket.io";

export class RaceAwaitingListener extends Listener<RaceAwaitingEvent>{
    queueGroupName = queueGroupName ;
    subject = Subjects.RaceAwaitng as const ;
    async onMessage(data: RaceAwaitingEvent ['data'], msg: Message): Promise<void> {
        // logique for here will be sending back a client response for the user2 in the request
        // so he either accepts the rece requests or not 
        const io = getIO() ;
        // there will be a listener in the frontend socket client
        // that will treat this request being sent being listend on receive_race
        
        io.to(`user:${data.userData.user2}`).emit('recieve_race' , data) ;
        msg.ack() ;
    }
}