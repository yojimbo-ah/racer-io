import OutboxEvent from "../models/outbox-model";
import { OutboxEventDocument } from "../models/outbox-model";
import { Subjects , userCreatedEvent , userUpdatedEvent } from "@racer-io/common";
import { UserCreatedPublisher } from "../events/publishers/userCreatedPublisher";
import { UserUpdatedPublisher } from "../events/publishers/userUpdatedPublisher";
import { natsWrapper } from "../nats-wrapper";
import { SpanStatusCode , context , propagation} from "@opentelemetry/api";
import { tracer } from "../utils/tracer";

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
    // extract the carrier and the parrent context so we can
    // continue the tracking across services 
    const carrier = ((doc as any).traceCarrier ?? {}) as Record<string, string>;
    console.log('[Auth Relay Carrier]:', JSON.stringify(doc.traceCarrier, null, 2));
    console.log('[Publisher Injected Carrier]:', JSON.stringify(carrier, null, 2));
    const parentCtx = propagation.extract(context.active(), carrier);
    // here we start a tracer inside the parent context so we can log the data for grafana later
    // to check cases of bottle necks and more 
    return context.with(parentCtx, async () => {
        return tracer.startActiveSpan('Outbox.publishAndMark', async (span) => {
            span.setAttribute('outbox.event_type', doc.eventType);
            span.setAttribute('outbox.event_id', String(doc._id));
            span.setAttribute('outbox.attempts', doc.attempts ?? 0);

            try {
                // 3. AWAIT the publisher calls so context remains active during publish
                if (doc.eventType === Subjects.userCreated) {
                    const payload = doc.payload as userCreatedEvent['data'];
                    await new UserCreatedPublisher(natsWrapper.client).publish(payload, carrier);
                }
                if (doc.eventType === Subjects.userUpdated) {
                    const payload = doc.payload as userUpdatedEvent['data'];
                    await new UserUpdatedPublisher(natsWrapper.client).publish(payload, carrier);
                }

                doc.published = true;
                doc.publishedAt = new Date();
                await doc.save();
                span.setStatus({ code: SpanStatusCode.OK });
            } catch (err) {
                doc.attempts = (doc.attempts ?? 0) + 1;
                doc.lastError = String(err);
                await doc.save();
                span.setStatus({ 
                    code: SpanStatusCode.ERROR, 
                    message: (err as Error).message 
                });
            } finally {
                span.end();
            }
        });
    });
}