import OutboxEvent from "../models/outbox-model";
import { OutboxEventDocument } from "../models/outbox-model";
import { Subjects , CheaterDetectedEvent , PositionUpdatedArchiveEvent , RaceAwaitingEvent
    , SubjectsUserCreationSaga, RaceCancelledEvent , RaceFinishedEvent, RaceStartedEvent,
    UserCreatedResultRacesArchiveEvent
} from "@racer-io/common";
import { natsWrapper } from "../nats-wrapper";

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
    try {
        // check the event type then we publish depending on the event
        console.log(doc) ;
        // will add the subjects later
        if (Subjects.CheaterDetected) {
            const payload  = doc.payload as  CheaterDetectedEvent['data'] ;
            new CheaterDetectedPublisher(natsWrapper.client).publish(payload) ;
        }

        if (Subjects.PositionUpdatedArchive) {
            const payload = doc.payload as PositionUpdatedArchiveEvent['data'] ;
            new PositionUpdatedAchivePublisher(natsWrapper.client).publish(payload) ;
        }

        if (Subjects.RaceAwaitng) {
            const payload = doc.payload as RaceAwaitingEvent['data'] ;
            new RaceAwaitingPublisher(natsWrapper.client).publish(payload) ;
        }

        if (Subjects.RaceCancelled) {
            const payload = doc.payload as RaceCancelledEvent['data'] ;
            new RaceCancelledPublisher(natsWrapper.client).publish(payload) ;
        }

        if (Subjects.RaceFinished) {
            const payload = doc.payload as RaceFinishedEvent['data'] ;
            new RaceFinishedPublisher(natsWrapper.client).publish(payload) ;
        }

        if (Subjects.RaceStarted) {
            const payload = doc.payload as RaceStartedEvent['data'] ;
            new RaceStartedPublisher(natsWrapper.client).publish(payload) ;
        }

        if (SubjectsUserCreationSaga.UserCreatedResultRacesArchive) {
            const payload = doc.payload as UserCreatedResultRacesArchiveEvent['data'] ;
            new UserCreatedResultRacesArchivePublisher(natsWrapper.client).publish(payload) ;
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