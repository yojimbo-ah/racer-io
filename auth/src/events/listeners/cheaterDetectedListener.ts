import { Listener , Subjects , CheaterDetectedEvent } from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import User from "../../models/user-model";


export class CheaterDetectedListener extends Listener<CheaterDetectedEvent> {
    subject = Subjects.CheaterDetected as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: CheaterDetectedEvent['data'], msg: Message): Promise<void> {
        // the logique of the listener 
        // still didnt create it yet but i will in the future
        const user = await User.findById(data.userId) ;
        if (!user) {
            throw new Error('Coulnt fidn the right user') ;
        }
        user.under_supervision = true ;
        user.reason_supervision = data.reason ;
        user.save() ;
        msg.ack() ;
    }
}