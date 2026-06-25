import { Listener , Subjects , RaceFinishedEvent , Position, RaceStatus } from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import redis from "../../redis";

export class RaceFinishedListener extends Listener<RaceFinishedEvent> {
    subject = Subjects.RaceFinished as const ;
    queueGroupName = queueGroupName; 
    async onMessage(data: RaceFinishedEvent['data'] , msg: Message): Promise<void> {
        // will have to do something with the client feedback here 

        msg.ack() ;
    }
}