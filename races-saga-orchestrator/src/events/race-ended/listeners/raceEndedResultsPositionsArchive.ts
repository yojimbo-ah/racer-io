import { Listener , SubjectRaceEndedSaga , RaceEndedResultPositionsArchiveEvent, SubjectsUserCreationSaga} from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { RaceEndedSaga , SagaStep , Steps} from "../../../models/race-ended-saga-model";
import OutboxEvent from "../../../models/outbox-saga-model";
import mongoose from "mongoose";
import { componsate } from "../componsate";
import { Services } from "@racer-io/common";
import { RaceEndedSagaResultEvent } from "@racer-io/common";

export default class RaceEndedResultPositionsArchiveListener extends Listener<RaceEndedResultPositionsArchiveEvent> {
    subject = SubjectRaceEndedSaga.raceEndedResultPositionsArchive as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceEndedResultPositionsArchiveEvent['data'] , msg: Message): Promise<void> {
        // logique will be added here still not yet
        if (data.status) {
            const raceEndedSaga = await RaceEndedSaga.findById(data.sagaId) ;
            if (!raceEndedSaga) {
                // probabaly will never happen will look for fix in 
                // the future to improve it hopefully
                msg.ack() ;
                return ;
            } ;

            if (data.service === Services.archive) {
                raceEndedSaga.respondedServices.push(Services.archive) ;
                raceEndedSaga.completedSteps.push(SagaStep.ARCHIVE_ENDED) ;
            };
            if (data.service === Services.positions) {
                raceEndedSaga.respondedServices.push(Services.positions) ;
                raceEndedSaga.completedSteps.push(SagaStep.POSITIONS_ENDED) ;
            };
            const mongoSession = await mongoose.startSession() ;
            try {
                await mongoSession.withTransaction(async () => {
                    await raceEndedSaga.save({session : mongoSession}) ;
                    if (raceEndedSaga.completedSteps.length === Steps.length) {
                        // in case of all steps had been done
                        // notify the race service
                        const payload : RaceEndedSagaResultEvent['data'] = {
                            raceId : raceEndedSaga.raceId ,
                            status : false
                        }
                        await OutboxEvent.build({
                            eventType : SubjectsUserCreationSaga.UserCreatedSagaResult ,
                            payload,
                            traceCarrier: (data as any)._traceCarrier
                        }).save({session : mongoSession}) ;
                    } else if (raceEndedSaga.respondedServices.length === Steps.length) {
                        // similair to other listeners componsating logique 
                        // check other files for more details how it works
                        await componsate(raceEndedSaga , mongoSession) ;
                    }
                })
                
            } catch (err) {
                console.log(err) ;
            } finally {
                await mongoSession.endSession() ;
                msg.ack() ;
            } ;


        } else {
            // case of failure in the service 
            const raceEndedSaga = await RaceEndedSaga.findById(data.sagaId) ;
            if (!raceEndedSaga) {
                msg.ack() ;
                return ;
            }
            raceEndedSaga.respondedServices.push(data.service) ;
            const mongoSession = await mongoose.startSession() ;
            try {
                await mongoSession.withTransaction(async () => {
                    await raceEndedSaga.save({session : mongoSession}) ;
                    if (raceEndedSaga.respondedServices.length === Steps.length) {
                        // means the other service has replied 
                        await componsate(raceEndedSaga , mongoSession) ;

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