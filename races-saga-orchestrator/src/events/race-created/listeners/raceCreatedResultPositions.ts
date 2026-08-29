import { Listener , SubjectRaceSage , RaceCreatedResultPositionsArchiveEvent , Services, SubjectsUserCreationSaga, RaceCreatedSagaResultEvent} from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { RaceSaga, Steps } from "../../../models/race-saga-model";
import { SagaStep } from "../../../models/race-saga-model";
import RaceCreatedResultSagaPublisher from "../publishers/raceCreatedResultSagaPublisher";
import { componsate } from "../componsate";
import OutboxEvent from "../../../models/outbox-saga-model";
import mongoose, { mongo } from "mongoose";

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
                raceSaga.respondedServices.push(Services.archive) ;
                raceSaga.completedSteps.push(SagaStep.RACE_ARCHIVED) ;
            }
            if (data.service === Services.positions) {
                raceSaga.respondedServices.push(Services.positions) ;
                raceSaga.completedSteps.push(SagaStep.POSITIONS_INITIALIZED) ;
            }
            const mongoSession = await mongoose.startSession() ;
            // we will use transactions for data integrity
            try {
                await mongoSession.withTransaction(async () => {
                    await raceSaga.save({session : mongoSession}) ;
                    // add more cheks here bceause currenlty we just check the length
                    if (raceSaga.completedSteps.length === Steps.length) {
                        // in case of all steps had been done
                        // notify the race service
                        const payload : RaceCreatedSagaResultEvent['data'] = {
                            raceId : raceSaga.raceId ,
                            status : true
                        }
                        await OutboxEvent.build({
                            eventType : SubjectRaceSage.raceCreatedSagaResult ,
                            payload
                        }).save({session : mongoSession}) ;

                    } else if (raceSaga.respondedServices.length === Steps.length) {
                        // simlair to the userCreated service read the documentation 
                        // there
                        // pass the session to make sure the componsation
                        // is always synced with the databse and everything is well structured
                        await componsate(raceSaga , mongoSession) ;
                    }
                })
            } catch (err) {
                // error here cancsale everything and send the error back
                // if componsationg fails , it will be treated later when the realy happens 
                // again beceause the outbox event will be set as not treated
                console.log(err) ;
            } finally {
                await mongoSession.endSession() ;
                msg.ack() ;
            }

        } else {
            // case of failure in the service componsate but after the every other service has sent back thare request
            const raceSaga = await RaceSaga.findById(data.sagaId) ;
            if (!raceSaga) {
                // probably never happen still dont know how to treat it
                msg.ack(); 
                return ;
            }
            // push the service then check the length if it 3 then all the services had
            // responded 
            raceSaga.respondedServices.push(data.service) ;
            const mongoSession = await mongoose.startSession() ;
            try {
                await mongoSession.withTransaction(async () => {
                    await raceSaga.save({session : mongoSession}) ;
                    if (raceSaga.respondedServices.length === Steps.length) {
                        // means the other service has replied 
                        await componsate(raceSaga , mongoSession) ;

                    }
                })
            } catch (err) {
                // error cancel everything here
                // still didnt know what to do in this section of the 
                // app 
                console.log(err)
            } finally {
                await mongoSession.endSession() ;
                msg.ack() ;
            }
            msg.ack()
        }
    }
}