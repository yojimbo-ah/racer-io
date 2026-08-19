import { Listener , SubjectRaceSage , RaceCreatedResultPositionsEvent } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { RaceSaga, Steps } from "../../../models/race-saga-model";
import { SagaStep } from "../../../models/race-saga-model";
import RaceCreatedResultSagaPublisher from "../publishers/raceCreatedResultSagaPublisher";

export default class RaceCreatedResultPositionsListener extends Listener <RaceCreatedResultPositionsEvent>{
    subject = SubjectRaceSage.raceCreatedResultPositions as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceCreatedResultPositionsEvent['data'], msg: Message): Promise<void> {
        // still didnt add the logique here
        if (data.status) {
            // case of success 
            const raceSaga = await RaceSaga.findById(data.sagaId) ;
            if (!raceSaga) {
                // probably never happen still dont know how to treat it
                msg.ack(); 
                return ;
            }
            raceSaga.completedSteps.push(SagaStep.POSITIONS_INITIALIZED) ;
            // in case all the steps had been done
            await raceSaga.save() ;
            if (raceSaga.completedSteps.length === Steps.length) {
                // in case of all steps had been done
                // notify the race service
                new RaceCreatedResultSagaPublisher(this.client).publish({
                    raceId : raceSaga.raceId ,
                    status : true
                })

            }
            msg.ack() ;

        } else {
            // case of failure in the service componsate but after the every other service has sent back thare request
            

        }
    }
}