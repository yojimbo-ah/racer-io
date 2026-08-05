import { Subjects , Listener , AnomalyDetectedEvent } from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import User from "../../models/user-model";
import Anomaly from "../../models/anomaly-model";
import CheaterDetectedPublisher from "../publishers/cheaterDetectedPublisher";
import { natsWrapper } from "../../nats-wrapper";

const ANOMALY_COUNT_BEFORE_DESACTIVATE = 5 ;

export class AnomalyDetectedListener extends Listener<AnomalyDetectedEvent>{
    subject = Subjects.AnomalyDetected as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: AnomalyDetectedEvent['data'] , msg: Message): Promise<void> {
        // still dont know what to do when anomaly is triggered
        // currently is just a anomaly counter it simple setup
        const user = await User.findById(data.userId) ;
        if (!user) {
            throw new Error('Couldnt find the user') ;
        } ;
        const weekAgo = new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
        );

        const count = await Anomaly.countDocuments({
            userId : data.userId,
            timestamp: {
                $gte: weekAgo
            }
        });
        if (count === ANOMALY_COUNT_BEFORE_DESACTIVATE) {
            // publish cheater detected event
            // still didnt create it 
            // and save the user in this service as cheater also 
            new CheaterDetectedPublisher(natsWrapper.client).publish(data) ;
        } ;

        if (count > ANOMALY_COUNT_BEFORE_DESACTIVATE) {
            throw new Error('Account desactivated') ;
        } ;
        const anomaly = Anomaly.build(data) ;
        await anomaly.save() ;

        msg.ack() ;
    }
}