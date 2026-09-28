import { Listener , SubjectRaceEndedSaga ,  RaceFinishedEvent , RaceEndedSagaEvent , Subjects} from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { RaceEndedSaga ,  SagaStep } from "../../../models/race-ended-saga-model";
import { Services } from "@racer-io/common";
import mongoose from "mongoose";
import OutboxEvent from "../../../models/outbox-saga-model";
import RaceEndedResultSagaPublisher from "../publishers/raceEndedResultSagaPublisher";
import { natsWrapper } from "../../../nats-wrapper";


export default class RaceEndedSagaListener extends Listener<RaceFinishedEvent>{
    queueGroupName = queueGroupName ;
    subject = Subjects.RaceFinished as const ;
    async onMessage(data:  RaceFinishedEvent['data'] , msg: Message): Promise<void> {
        // logique will be added here still not yet
        const raceEndedSaga = RaceEndedSaga.build({
            raceId : data.race.raceId 
        }) ;
        raceEndedSaga.respondedServices.push(Services.races) ;
        raceEndedSaga.completedSteps.push(SagaStep.RACE_ENDED) ;
        const mongoSession = await mongoose.startSession() ;

        try {
            mongoSession.withTransaction(async () => {
                await raceEndedSaga.save({session : mongoSession}) ;
                const payload : RaceEndedSagaEvent['data'] = {
                    sagaId : String(raceEndedSaga._id) ,
                    payload : data
                } ;
                await OutboxEvent.build({
                    eventType : SubjectRaceEndedSaga.raceEndedsaga ,
                    payload : payload ,
                    traceCarrier : (data as any)._traceCarrier
                }).save({session : mongoSession}) ;
            })
        } catch (err) {
            await new RaceEndedResultSagaPublisher(natsWrapper.client).publish({
                raceId : data.race.raceId ,
                status : false
            }) ;
        } finally {
            await mongoSession.endSession() ;
            msg.ack() ;
        } ;

    }
}