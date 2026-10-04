import { Listener , RaceCreatedSagaEvent , SubjectRaceSage , RaceStatus , Services 
    , RaceCreatedResultPositionsArchiveEvent} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Race from "../../models/race-model";
import RaceCreatedResultPositionsArchivePublisher from "../publishers/raceCreatedResultPositionsArchivePublisher";
import OutboxEvent from "../../models/outbox-model";
import mongoose from "mongoose";
import { context, propagation } from "@opentelemetry/api";

export default class RaceCreatedSagaListener extends Listener<RaceCreatedSagaEvent> {
    subject = SubjectRaceSage.raceCreatedsaga as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceCreatedSagaEvent['data'] , msg: Message): Promise<void> {
        // create the strating event and use the try and catch blocks here
        const race = Race.build({
            _id : data.payload.race.raceId ,
            endingPos : data.payload.race.endPosition ,
            raceStatus : RaceStatus.RaceStared ,
            startPos : data.payload.race.startPos ,
            users : [data.payload.userData.user1 , data.payload.userData.user2] ,
        }) ;
        const mongoSession = await mongoose.startSession();
        try {
            await mongoSession.withTransaction(async () => {
                await race.save({ session: mongoSession });

                const payload: RaceCreatedResultPositionsArchiveEvent['data'] = {
                raceId : data.payload.race.raceId ,
                    sagaId : data.sagaId ,
                    service : Services.archive ,
                    status : true
                }
                // used to pass the carrier to the event that gonna publish
                // and it just saved by the outbox model only 
                const carrier: Record<string, string> = {};
                propagation.inject(context.active(), carrier);
                await OutboxEvent.build({
                    eventType: SubjectRaceSage.raceCreatedResultPositionsArchive ,
                    payload ,
                    traceCarrier : carrier
                }).save({ session: mongoSession });
            });
        } catch (err) {
            // failure case
            await new RaceCreatedResultPositionsArchivePublisher(this.client).publish({
                raceId : data.payload.race.raceId ,
                sagaId : data.sagaId ,
                service : Services.archive ,
                // status false in the case of failure as always 
                // simalir to other services 
                status : false
            })
        } finally {
            await mongoSession.endSession();
            msg.ack() ;
        }
    }
}