import { natsWrapper } from "../nats-wrapper";
import { SpanStatusCode, context, propagation } from "@opentelemetry/api";
import { tracer } from "../utils/tracer";
import OutboxEvent , {OutboxEventDocument} from "../models/outbox-model";
import { RaceEndedResultPositionsArchiveEvent , UserCreatedResultRacesArchiveEvent , RaceCreatedResultPositionsArchiveEvent ,
    SubjectsUserCreationSaga , SubjectRaceEndedSaga , SubjectRaceSage
 } from "@racer-io/common";
import RaceCreatedResultPositionsArchivePublisher from "../events/publishers/raceCreatedResultPositionsArchivePublisher";
import RaceEndedResultPositionsArchivePublisher from "../events/publishers/raceEndedResultPositionsArchive";
import UserCreatedResultRacesArchivePublisher from "../events/publishers/userCreatedResultArchiveRaces";
// as you can see not all routes and listeners need to modify the data inside the databse
// so some publishers will still be published directly , no need for the outbox pattren here



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
            // console.log(doc) ;
            // will add the subjects later
            if (doc.eventType === SubjectRaceSage.raceCreatedResultPositionsArchive) {
                const payload = doc.payload as RaceCreatedResultPositionsArchiveEvent['data'] ;
                new RaceCreatedResultPositionsArchivePublisher(natsWrapper.client).publish(payload) ;
            }
            if (doc.eventType === SubjectsUserCreationSaga.UserCreatedResultRacesArchive) {
                const payload = doc.payload as UserCreatedResultRacesArchiveEvent['data'] ;
                new UserCreatedResultRacesArchivePublisher(natsWrapper.client).publish(payload) ;
            }
            if (doc.eventType === SubjectRaceEndedSaga.raceEndedResultPositionsArchive) {
                const payload = doc.payload as RaceEndedResultPositionsArchiveEvent['data'] ;
                new RaceEndedResultPositionsArchivePublisher(natsWrapper.client).publish(payload) ;
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