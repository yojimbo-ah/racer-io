import OutboxEvent from "../models/outbox-saga-model";
import { OutboxEventDocument } from "../models/outbox-saga-model";
import { Subjects , CheaterDetectedEvent , PositionUpdatedArchiveEvent , RaceAwaitingEvent
    , SubjectsUserCreationSaga, RaceCancelledEvent , RaceFinishedEvent, RaceStartedEvent,
    UserCreatedResultRacesArchiveEvent
} from "@racer-io/common";
import { natsWrapper } from "../nats-wrapper";

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
    try {
        // check the event type then we publish depending on the event
        console.log(doc) ;
        // will add the publishers here :
        
        doc.published = true;
        doc.publishedAt = new Date();
        await doc.save();
    } catch (err) {
        doc.attempts += 1;
        doc.lastError = String(err);
        await doc.save();
    }
}