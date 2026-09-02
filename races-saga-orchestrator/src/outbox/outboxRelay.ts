import OutboxEvent from "../models/outbox-saga-model";
import { OutboxEventDocument } from "../models/outbox-saga-model";
import { Subjects , SubjectsUserCreationSaga , SubjectRaceSage ,
    UserCreatedResultRacesArchiveEvent , UserCreatedSagaEvent , UserCreationCancelledArchiveEvent ,
    UserCreationCancelledRacesEvent , RaceCancelledArchiveEvent , RaceCancelledPositionsEvent ,
    RaceCreatedCancelledSocketGateway , RaceCreatedSagaEvent , RaceCreatedResultPositionsArchiveEvent,
    UserCreatedSagaResultEvent,
    RaceCreatedSagaResultEvent
} from "@racer-io/common";
import { natsWrapper } from "../nats-wrapper";
import { SpanStatusCode, context, propagation } from "@opentelemetry/api";
import { tracer } from "../utils/tracer";

// user-saga
import UserCreatedResultSagaPublisher from "../events/user-created/publishers/userCreatedResultSagaPublisher";
import UserCreatedSagaPublisher from "../events/user-created/publishers/userCreatedSagaPublisher";
import UserCreationCancelledArchivePublisher from "../events/user-created/publishers/userCreationCancelledArchivePublisher";
import UserCreationCancelledRacesPublisher from "../events/user-created/publishers/userCreationCancelledRacesPublisher";

// race-saga
import RaceCancelledArchivePublisher from "../events/race-created/publishers/raceCancelledArchivePublisher";
import RaceCancelledPositionsPublisher from "../events/race-created/publishers/raceCancelledPositionsPublisher";
import RaceCancelledSocketgatewayPublisher from "../events/race-created/publishers/raceCancelledSocketGateway";
import RaceCreatedResultSagaPublisher from "../events/race-created/publishers/raceCreatedResultSagaPublisher";
import RaceCreatedSagaPublisher from "../events/race-created/publishers/raceCreatedSagaPublisher";

// as you can see not all routes and listeners need to modify the data inside the databse
// so some publishers will still be published directly , no need for the outbox pattren here


// events that we need to publish if the databse updates or insert or delete a query 


// outbox-relay.ts
export async function startOutboxRelay() {
    // catch up on anything missed while relay was down
    console.log('starting the ralay function tracking') ;
    const pending = await OutboxEvent.find({ published: false }).sort({ createdAt: 1 });
    for (const doc of pending) {
        await publishAndMark(doc);
    }

    const changeStream = OutboxEvent.watch([{ $match: { operationType: 'insert' } }]);
    changeStream.on('change', async (change: any) => {
        const doc = await OutboxEvent.findById(change.documentKey._id);
        if (doc && !doc.published) await publishAndMark(doc);
    });
    
    changeStream.on('error', (err) => {
        console.error('[outbox-relay] change stream error:', err);
    });

    console.log('[outbox-relay] relay is now watching for new events');
}

export async function publishAndMark(doc: OutboxEventDocument) {
    const parentCtx = propagation.extract(context.active(), doc.traceCarrier ?? {});
    return context.with(parentCtx, () => tracer.startActiveSpan('outbox.publishAndMard' , async (span) => {
        try {
            span.setAttribute('outbox.event_type' , doc.eventType) ;
            span.setAttribute('outbox.event_id' , String(doc._id)) ;
            span.setAttribute('outbox.attemps' , doc.attempts ?? 0) ;
            // check the event type then we publish depending on the event
            console.log(doc) ;
            // will add the publishers here :
            // user-created-saga publishers
            if (doc.eventType === SubjectsUserCreationSaga.UserCreatedSagaResult) {
                const payload = doc.payload as UserCreatedSagaResultEvent['data'] ;
                await new UserCreatedResultSagaPublisher(natsWrapper.client).publish(payload) ;
            }
            if (doc.eventType === SubjectsUserCreationSaga.UserCreatedSaga) {
                const payload = doc.payload as UserCreatedSagaEvent['data'] ;
                await new UserCreatedSagaPublisher(natsWrapper.client).publish(payload) ;
            }
            if (doc.eventType === SubjectsUserCreationSaga.UserCreationCancelledArchive) {
                const payload = doc.payload as UserCreationCancelledArchiveEvent['data'] ;
                await new UserCreationCancelledArchivePublisher(natsWrapper.client).publish(payload) ;
            }
            if (doc.eventType === SubjectsUserCreationSaga.UserCreationCancelledRaces) {
                const payload = doc.payload as UserCreationCancelledRacesEvent['data'] ;
                await new UserCreationCancelledRacesPublisher(natsWrapper.client).publish(payload) ;
            }

            // race-created-saga  publishers
            if (doc.eventType === SubjectRaceSage.raceCancelledArchive) {
                const payload = doc.payload as RaceCancelledArchiveEvent['data'] ;
                await new RaceCancelledArchivePublisher(natsWrapper.client).publish(payload) ;
            }
            if (doc.eventType === SubjectRaceSage.raceCancelledPositions) {
                const payload = doc.payload as RaceCancelledPositionsEvent['data'] ;
                await new RaceCancelledPositionsPublisher(natsWrapper.client).publish(payload) ;
            }
            if (doc.eventType === SubjectRaceSage.raceCreatedCancelledSocketGateway) {
                const payload = doc.payload as RaceCreatedCancelledSocketGateway['data'] ;
                await new RaceCancelledSocketgatewayPublisher(natsWrapper.client).publish(payload) ;
            }
            if (doc.eventType === SubjectRaceSage.raceCreatedSagaResult) {
                const payload = doc.payload as RaceCreatedSagaResultEvent['data'] ;
                await new RaceCreatedResultSagaPublisher(natsWrapper.client).publish(payload) ;
            }
            if (doc.eventType === SubjectRaceSage.raceCreatedsaga) {
                const payload = doc.payload as RaceCreatedSagaEvent['data'] ;
                await new RaceCreatedSagaPublisher(natsWrapper.client).publish(payload) ;
            }

            doc.published = true;
            doc.publishedAt = new Date();
            await doc.save();
            span.setStatus({code : SpanStatusCode.OK}) ;
        } catch (err) {
            doc.attempts += 1;
            doc.lastError = String(err);
            await doc.save();
            span.setStatus({code : SpanStatusCode.ERROR , message : (err as Error).message}) ;
        } finally {
            span.end() ;
        }
    }))

}