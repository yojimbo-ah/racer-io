import { Listener , RaceStatus , RaceEndedSagaEvent, SubjectRaceEndedSaga , Services , 
    raceEndedCancelledPositionsEvent , SubjectRaceSage , RaceEndedResultPositionsArchiveEvent 
} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Race from "../../models/race-model";
import RaceEndedResultPositionsArchivePublisher from "../publishers/raceEndedResultPositionsArchive";
import OutboxEvent from "../../models/outbox-model";
import { context, propagation } from "@opentelemetry/api";
import mongoose, { mongo } from 'mongoose' ;

// change it to listen to another even not this event 
// the event to listen to is : RaceEndedSagaEvent

// for now we still didnt add the outbox pattren into the archive service
// and i still didnt add transactions id add them later currently i wll not 
// make it atomic (might cause problems) ;
// the setup is fragile i wll improve it in the future of course
export class RaceFinishedListener extends Listener <RaceEndedSagaEvent>{
    queueGroupName =  queueGroupName ;
    subject = SubjectRaceEndedSaga.raceEndedsaga as const ;
    async onMessage(data: RaceEndedSagaEvent['data'], msg: Message): Promise<void> {
        // logique to save the user positon

        const race = await Race.findById(data.payload.race.raceId) ;
        if (!race) {
            throw new Error('error happened') ;
        }

        race.winner = data.payload.userData.winner ;
        race.raceStatus = RaceStatus.RaceEnded ;
        const mongoSession = await mongoose.startSession() ;
        try {
            mongoSession.withTransaction(async () => {
                race.save({session : mongoSession}) ;
                const payload : RaceEndedResultPositionsArchiveEvent['data'] = {
                    raceId : data.payload.race.raceId ,
                    sagaId : data.sagaId ,
                    service : Services.archive ,
                    status : true
                } ;
                const carrier: Record<string, string> = {};
                propagation.inject(context.active(), carrier);
                await OutboxEvent.build({
                    eventType : SubjectRaceEndedSaga.raceEndedResultPositionsArchive ,
                    payload ,
                    traceCarrier : carrier
                }).save({session : mongoSession}) ;
            })
        } catch (err) {
            // failure event here 
            new RaceEndedResultPositionsArchivePublisher(this.client).publish({
                raceId : data.payload.race.raceId ,
                sagaId : data.sagaId ,
                service : Services.archive ,
                status : false
            })
        } finally {
            await mongoSession.endSession() ;
            msg.ack(); 
        }
    }
}