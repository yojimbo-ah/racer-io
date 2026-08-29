import { RaceSagaDocument , SagaStatus , SagaStep  } from "../../models/race-saga-model";
import { ClientSession } from "mongoose";
import { SubjectRaceSage } from "@racer-io/common";
import OutboxEvent from "../../models/outbox-saga-model";

// this function cancelles the events that had been succefully been taited by the services
// in case of failure of single one at least

export const componsate = async (raceSaga: RaceSagaDocument, session: ClientSession) => {
    raceSaga.status = SagaStatus.COMPENSATING;
    await raceSaga.save({ session });

    const events: { eventType: string; payload: any }[] = [];

    if (raceSaga.completedSteps.includes(SagaStep.POSITIONS_INITIALIZED)) {
        events.push({
            eventType: SubjectRaceSage.raceCancelledPositions, // whatever your subject enum is
            payload: {
                raceId: raceSaga.raceId,
                sagaId: String(raceSaga._id),
                users: { user1: raceSaga.users[0], user2: raceSaga.users[1] }
            }
        });
    }

    if (raceSaga.completedSteps.includes(SagaStep.RACE_ARCHIVED)) {
        events.push({
            eventType: SubjectRaceSage.raceCancelledArchive,
            payload: { raceId: raceSaga.raceId, sagaId: String(raceSaga._id) }
        });
    }

    if (raceSaga.completedSteps.includes(SagaStep.RACE_CREATED)) {
        events.push({
            eventType: SubjectRaceSage.raceCreatedSagaResult,
            payload: { status: false, raceId: raceSaga.raceId }
        });
    }
    // always send the event to the socket-gateway service
    events.push({
        eventType: SubjectRaceSage.raceCreatedCancelledSocketGateway,
        payload: { raceId: raceSaga.raceId, status: false, users: raceSaga.users }
    });
    // insert many events at the same time depedning at the componsation
    // at the same time
    await OutboxEvent.insertMany(
        events.map(e => ({ eventType: e.eventType, payload: e.payload })),
        { session }
    );
};