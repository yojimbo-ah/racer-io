import { Listener , RaceStartedEvent , Subjects } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { RaceSaga } from "../../../models/race-saga-model";
import { SagaStep } from "../../../models/race-saga-model";
import RaceCreatedSagaPublisher from "../publishers/raceCreatedSagaPublisher";

export default class RaceCreatedSagaListener  extends Listener<RaceStartedEvent> {
    queueGroupName = queueGroupName ;
    subject = Subjects.RaceStarted as const ;
    async onMessage(data: RaceStartedEvent['data'], msg: Message): Promise<void> {
        try {
            // create the saga model and send the saga event to the other services 
            const raceSaga = RaceSaga.build({
                raceId : data.race.raceId
            }) ;
            raceSaga.completedSteps.push(SagaStep.RACE_CREATED) ;
            await raceSaga.save() ;

            // publish to positions and archive service
            await new RaceCreatedSagaPublisher(this.client).publish({
                sagaId : String(raceSaga._id) ,
                payload : data
            });

            // publish to archive service

        } catch (err) {

        }

    }
}