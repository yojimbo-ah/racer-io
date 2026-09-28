import { Publisher , SubjectRaceEndedSaga , raceEndedCancelledPositionsEvent } from "@racer-io/common";

export default class RaceEndedCancelledPositionsPublisher extends Publisher<raceEndedCancelledPositionsEvent> {
    subject = SubjectRaceEndedSaga.raceEndedCancelledPositions as const ;
}