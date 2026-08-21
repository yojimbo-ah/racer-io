import { Listener , SubjectRaceSage , RaceCreatedResultPositionsArchiveEvent , Services} from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { RaceSaga, Steps } from "../../../models/race-saga-model";
import { SagaStep } from "../../../models/race-saga-model";
import RaceCreatedResultSagaPublisher from "../publishers/raceCreatedResultSagaPublisher";
import { componsate } from "../componsate";

// this listener treateat the events comming from both the services archive and positions at the same time 
// weither it success or failure status 

// still not fully fixed

export default class RaceCreatedResultPositionsListener extends Listener <RaceCreatedResultPositionsArchiveEvent>{
    subject = SubjectRaceSage.raceCreatedResultPositionsArchive as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceCreatedResultPositionsArchiveEvent['data'], msg: Message): Promise<void> {
        // still didnt add the logique here
        if (data.status) {
            // case of success 
            const raceSaga = await RaceSaga.findById(data.sagaId) ;
            if (!raceSaga) {
                // probably never happen still dont know how to treat it
                msg.ack(); 
                return ;
            }
            // depends on the service 
            if (data.service === Services.archive) {
                raceSaga.completedSteps.push(SagaStep.RACE_ARCHIVED) ;
            }
            if (data.service === Services.positions) {
                raceSaga.completedSteps.push(SagaStep.POSITIONS_INITIALIZED) ;
            }

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
            const raceSaga = await RaceSaga.findById(data.sagaId) ;
            if (!raceSaga) {
                // probably never happen still dont know how to treat it
                msg.ack(); 
                return ;
            }
            if (raceSaga.completedSteps.length === 2) {
                // means the other service has replied 
                await componsate(raceSaga) ;

            }
            // else we ack and we wait the other service to reply 
            msg.ack()
        }
    }
}