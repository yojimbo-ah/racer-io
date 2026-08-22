import { Listener , SubjectRaceSage , RaceCreatedCancelledSocketGateway } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import { getIO } from "../../socket.io";

// cancelles the race event send to the user so they get notified and the frontend
// changes the ui

export default class RaceCreatedCancelledSocketGatewayListener extends Listener<RaceCreatedCancelledSocketGateway>{
    queueGroupName = queueGroupName ;
    subject = SubjectRaceSage.raceCreatedCancelledSocketGateway as const ;
    async onMessage(data: RaceCreatedCancelledSocketGateway['data'], msg: Message): Promise<void> {
        const io = getIO() ;
        data.users.forEach(user => {
            // pubish to there private socket channels
            io.to(`user:${user}`).emit('race_cancelled' , data) ;
        })
        msg.ack() ;
    }
}