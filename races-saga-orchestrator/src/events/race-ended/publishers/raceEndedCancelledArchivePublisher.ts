import { Publisher , SubjectRaceEndedSaga  , RaceEndedCancelledArchiveEvent } from "@racer-io/common";

export default class RaceEndedCancelledArchivePublisher extends Publisher<RaceEndedCancelledArchiveEvent> {
    subject  = SubjectRaceEndedSaga.raceEndedCancelledArchive as const ;
}