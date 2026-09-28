import { Listener , SubjectRaceEndedSaga , RaceEndedSagaEvent } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";

export default class RaceEndedSagaListener extends Listener<RaceEndedSagaEvent>{
    queueGroupName = queueGroupName ;
    subject = SubjectRaceEndedSaga.raceEndedsaga as const ;
    async onMessage(data:  RaceEndedSagaEvent['data'] , msg: Message): Promise<void> {
        // logique will be added here still not yet
    }
}