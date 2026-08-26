import OutboxEvent from "../models/outbox-model";
import { OutboxEventDocument } from "../models/outbox-model";
import { Subjects , userCreatedEvent , userUpdatedEvent } from "@racer-io/common";
import { UserCreatedPublisher } from "../events/publishers/userCreatedPublisher";
import { UserUpdatedPublisher } from "../events/publishers/userUpdatedPublisher";
import { natsWrapper } from "../nats-wrapper";

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
    try {
        // check the event type then we publish depending on the event
        console.log(doc) ;
        if (doc.eventType === Subjects.userCreated) {
            const payload = doc.payload as userCreatedEvent['data'] ;
            new UserCreatedPublisher(natsWrapper.client).publish(payload) ;
        }
        if (doc.eventType === Subjects.userUpdated) {
            const payload = doc.payload as userUpdatedEvent['data'] ;
            new UserUpdatedPublisher(natsWrapper.client).publish(payload) ;
        }
        doc.published = true;
        doc.publishedAt = new Date();
        await doc.save();
    } catch (err) {
        doc.attempts += 1;
        doc.lastError = String(err);
        await doc.save();
    }
}