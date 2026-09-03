import { Listener , RaceStartedEvent , Services, 
    Subjects , RaceCreatedSagaEvent, SubjectRaceSage } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { RaceSaga } from "../../../models/race-saga-model";
import { SagaStep } from "../../../models/race-saga-model";
import OutboxEvent from "../../../models/outbox-saga-model";
import mongoose from "mongoose";
import RaceCreatedResultSagaPublisher from "../publishers/raceCreatedResultSagaPublisher";

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

        const mongoSession = await mongoose.startSession() ;
        try {
            await mongoSession.withTransaction(async () => {
                await raceSaga.save({session : mongoSession}) ;
                const payload : RaceCreatedSagaEvent['data'] = {
                    sagaId : String(raceSaga._id) ,
                    payload : data
                } ;
                await OutboxEvent.build({
                    eventType : SubjectRaceSage.raceCreatedsaga ,
                    payload,
                    traceCarrier: (data as any)._traceCarrier
                }).save({session : mongoSession}) ;
            })
        } catch (err) {
            // if error happens here we just retrive the reponse to the races-service
            // nothing will be saved and the service will now that the operation
            // didnt continue when the saving failed
            // with status false the service knows that if failed
                await new RaceCreatedResultSagaPublisher(this.client).publish({
                raceId : data.race.raceId ,
                status : false,
            }, (data as any)._traceCarrier)

        } finally {
            // delete the session and ack the message in both cases
            await mongoSession.endSession() ;
            msg.ack() ;
        }


        //  publish to positions and archive service
        // will be moved to the outbox relay
        // await new RaceCreatedSagaPublisher(this.client).publish({
        //     sagaId : String(raceSaga._id) ,
        //     payload : data
        // });

        // publish to archive service

    }
}