import { Publisher , SubjectRaceEndedSaga , RaceEndedSagaResultEvent } from "@racer-io/common";

export default class RaceEndedResultSagaPublisher extends Publisher<RaceEndedSagaResultEvent>{
    subject = SubjectRaceEndedSaga.raceEndedSagaResult as const ;
}