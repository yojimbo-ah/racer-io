import { Listener , Subjects , CheaterDetectedEvent } from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";

export class CheaterDetectedListener extends Listener<CheaterDetectedEvent> {
    subject = Subjects.CheaterDetected as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: CheaterDetectedEvent['data'], msg: Message): Promise<void> {
        // the logique of the listener 
        // still didnt create it yet but i will in the future
    }
}