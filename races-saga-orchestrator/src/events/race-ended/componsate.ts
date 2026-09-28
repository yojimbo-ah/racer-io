
// keeps the same logiqe just change it to match the race ending orchestration setup
// and configuration still didnt really put it up till now 

import { SagaStatus } from "../../models/race-saga-model";
import { RaceEndedSagaDocument , SagaStep  } from "../../models/race-ended-saga-model";

import { ClientSession } from "mongoose";
import {SubjectRaceEndedSaga } from "@racer-io/common";
import OutboxEvent from "../../models/outbox-saga-model";
import { context, propagation } from "@opentelemetry/api";

// this function cancelles the events that had been succefully been taited by the services
// in case of failure of single one at least



export const componsate = async (raceEndedSaga: RaceEndedSagaDocument, session: ClientSession) => {
    raceEndedSaga.status = SagaStatus.COMPENSATING;
    await raceEndedSaga.save({ session });

    const traceCarrier: Record<string, string> = {};
    propagation.inject(context.active(), traceCarrier);
    const events: { eventType: string; payload: any; traceCarrier: Record<string, string> }[] = [];

    if (raceEndedSaga.completedSteps.includes(SagaStep.POSITIONS_ENDED)) {
        events.push({
            eventType : SubjectRaceEndedSaga.raceEndedCancelledPositions ,
            payload : {
                raceId : raceEndedSaga.raceId ,
                sagaId : String(raceEndedSaga._id)
            } ,
            traceCarrier
        })
    }

    if (raceEndedSaga.completedSteps.includes(SagaStep.ARCHIVE_ENDED)) {
        events.push({
            eventType : SubjectRaceEndedSaga.raceEndedCancelledArchive ,
            payload : {
                raceId : raceEndedSaga.raceId ,
                sagaId : String(raceEndedSaga._id)
            } ,
            traceCarrier
        })
    }

    if (raceEndedSaga.completedSteps.includes(SagaStep.RACE_ENDED)) {
        events.push({
            eventType : SubjectRaceEndedSaga.raceEndedSagaResult ,
            payload : {
                status : false , raceId : raceEndedSaga.raceId
            } ,
            traceCarrier
        })
    }

    // insert many events at the same time depedning at the componsation
    // at the same time
    await OutboxEvent.insertMany(
        events,
        { session }
    );
};
