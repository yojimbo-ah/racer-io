import { Publisher , SubjectRaceEndedSaga , RaceEndedSagaEvent } from "@racer-io/common";

export default class RaceEndedSagaPublisher extends Publisher<RaceEndedSagaEvent>{
    subject = SubjectRaceEndedSaga.raceEndedsaga as const ;
}