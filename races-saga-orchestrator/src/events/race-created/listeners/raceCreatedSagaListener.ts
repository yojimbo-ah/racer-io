import { Listener , RaceStartedEvent , Services, Subjects } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { RaceSaga } from "../../../models/race-saga-model";
import { SagaStep } from "../../../models/race-saga-model";
import RaceCreatedSagaPublisher from "../publishers/raceCreatedSagaPublisher";

// this one listens for the races service to intilize the logique of the saga orchestrator

export default class RaceCreatedSagaListener  extends Listener<RaceStartedEvent> {
    queueGroupName = queueGroupName ;
    subject = Subjects.RaceStarted as const ;
    async onMessage(data: RaceStartedEvent['data'], msg: Message): Promise<void> {
        // create the saga model and send the saga event to the other services 
        const raceSaga = RaceSaga.build({
            raceId : data.race.raceId ,
            users : [data.userData.user1 , data.userData.user2]
        }) ;
        // add both events that it was treated and that it 
        // was succeful event traitement also 
        raceSaga.completedSteps.push(SagaStep.RACE_CREATED) ;
        raceSaga.respondedServices.push(Services.races) ;
        await raceSaga.save() ;

        // publish to positions and archive service
        await new RaceCreatedSagaPublisher(this.client).publish({
            sagaId : String(raceSaga._id) ,
            payload : data
        });

        // publish to archive service
        msg.ack() ;

    }
}