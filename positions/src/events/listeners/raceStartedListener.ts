import { Listener , Position, RaceStartedEvent , RaceStatus, Subjects } from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import redis from "../../redis";

export class RaceStartedListener extends Listener<RaceStartedEvent> {
    subject = Subjects.RaceStarted as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceStartedEvent['data'] , msg: Message): Promise<void> {
        // will have to do something with the client deedback here 

        msg.ack() ;
    }
}