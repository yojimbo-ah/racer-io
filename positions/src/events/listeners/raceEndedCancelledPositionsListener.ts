import { Listener , SubjectRaceEndedSaga , raceEndedCancelledPositionsEvent  } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";

export default class RaceEndedCancelledPositionsListener extends Listener <raceEndedCancelledPositionsEvent> {
    subject = SubjectRaceEndedSaga.raceEndedCancelledPositions as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: raceEndedCancelledPositionsEvent['data'] ,  msg: Message): Promise<void> {
        // dont use try and catch such in case of error the 
        // probabaly will do nothing here beceause nothing will happen 
        msg.ack() ;
    }
}