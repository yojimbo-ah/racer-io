import { Publisher , SubjectRaceEndedSaga , RaceEndedResultPositionsArchiveEvent } from "@racer-io/common";

export default class RaceEndedResultPositionsArchivePublisher extends Publisher<RaceEndedResultPositionsArchiveEvent>{
    subject = SubjectRaceEndedSaga.raceEndedResultPositionsArchive as const ;
}