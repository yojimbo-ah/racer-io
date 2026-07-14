import { Subjects , Listener , AnomalyDetectedEvent } from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import User from "../../models/user-model";

export class AnomalyDetectedListener extends Listener<AnomalyDetectedEvent>{
    subject = Subjects.AnomalyDetected as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: AnomalyDetectedEvent['data'] , msg: Message): Promise<void> {
        // still dont know what to do when anomaly is triggered
        // currently is just a anomaly counter it simple setup
        const user = await User.findById(data.userId) ;
        if (!user) {
            throw new Error('Couldnt find the user') ;
        }
        user.anomaly ++ ;
        await user.save() ;
        msg.ack() ;
    }
}