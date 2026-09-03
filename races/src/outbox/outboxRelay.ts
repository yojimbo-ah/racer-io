import OutboxEvent from "../models/outbox-model";
import { OutboxEventDocument } from "../models/outbox-model";
import { Subjects , CheaterDetectedEvent , PositionUpdatedArchiveEvent , RaceAwaitingEvent
    , SubjectsUserCreationSaga, RaceCancelledEvent , RaceFinishedEvent, RaceStartedEvent,
    UserCreatedResultRacesArchiveEvent
} from "@racer-io/common";
import { natsWrapper } from "../nats-wrapper";
import { SpanStatusCode, context, propagation } from "@opentelemetry/api";
import { tracer } from "../utils/tracer";
// as you can see not all routes and listeners need to modify the data inside the databse
// so some publishers will still be published directly , no need for the outbox pattren here


// events that we need to publish if the databse updates or insert or delete a query 
import CheaterDetectedPublisher from "../events/publishers/cheaterDetectedPublisher";
import { PositionUpdatedAchivePublisher } from "../events/publishers/positionUpdatedArchive";
import { RaceAwaitingPublisher } from "../events/publishers/raceAwaitingPublisher";
import { RaceCancelledPublisher } from "../events/publishers/RaceCancelledPublisher";
import { RaceFinishedPublisher } from "../events/publishers/raceEndedPublisher";
import { RaceStartedPublisher } from "../events/publishers/raceStartedPublisher";
import UserCreatedResultRacesArchivePublisher from "../events/publishers/userCreatedResultArchiveRaces";

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
    const carrier = (doc.traceCarrier ?? {}) as Record<string, string>;
    return context.with(parentCtx, () => tracer.startActiveSpan('outbox.publishAndMark' , async (span) => {
        try {
            // check the event type then we publish depending on the event
            span.setAttribute('outbox.event_type' , doc.eventType) ;
            span.setAttribute('outbox.event_id' , String(doc._id)) ;
            span.setAttribute('outbox.attemps' , doc.attempts ?? 0) ;
            console.log(doc) ;
            // will add the subjects later
            if (doc.eventType === Subjects.CheaterDetected) {
                const payload  = doc.payload as  CheaterDetectedEvent['data'] ;
                await new CheaterDetectedPublisher(natsWrapper.client).publish(payload, carrier) ;
            }

            if (doc.eventType === Subjects.PositionUpdatedArchive) {
                const payload = doc.payload as PositionUpdatedArchiveEvent['data'] ;
                await new PositionUpdatedAchivePublisher(natsWrapper.client).publish(payload, carrier) ;
            }

            if (doc.eventType === Subjects.RaceAwaitng) {
                const payload = doc.payload as RaceAwaitingEvent['data'] ;
                await new RaceAwaitingPublisher(natsWrapper.client).publish(payload, carrier) ;
            }

            if (doc.eventType === Subjects.RaceCancelled) {
                const payload = doc.payload as RaceCancelledEvent['data'] ;
                await new RaceCancelledPublisher(natsWrapper.client).publish(payload, carrier) ;
            }

            if (doc.eventType === Subjects.RaceFinished) {
                const payload = doc.payload as RaceFinishedEvent['data'] ;
                await new RaceFinishedPublisher(natsWrapper.client).publish(payload, carrier) ;
            }

            if  (doc.eventType === Subjects.RaceStarted) {
                const payload = doc.payload as RaceStartedEvent['data'] ;
                await new RaceStartedPublisher(natsWrapper.client).publish(payload, carrier) ;
            }

            if (doc.eventType === SubjectsUserCreationSaga.UserCreatedResultRacesArchive) {
                const payload = doc.payload as UserCreatedResultRacesArchiveEvent['data'] ;
                await new UserCreatedResultRacesArchivePublisher(natsWrapper.client).publish(payload, carrier) ;
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