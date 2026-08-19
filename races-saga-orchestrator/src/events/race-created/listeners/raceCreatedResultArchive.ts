import { Listener , SubjectRaceSage , RaceCreatedResultArchiveEvent } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { RaceSaga , SagaStep , Steps } from "../../../models/race-saga-model";
import RaceCreatedResultSagaPublisher from "../publishers/raceCreatedResultSagaPublisher";

// the logique to treat the result back from the archive service
// treated under the saga orchestrator logique

export default class RaceCreatedResultArchiveListener extends Listener<RaceCreatedResultArchiveEvent>{
     queueGroupName = queueGroupName ;
     subject = SubjectRaceSage.raceCreatedResultArchive as const ;
     async onMessage(data: RaceCreatedResultArchiveEvent['data'], msg: Message): Promise<void> {
        // still didnt create the logique here
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
               // the case of failute

          }
    }
}