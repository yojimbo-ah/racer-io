import { Publisher ,RaceCreatedSagaEvent , SubjectRaceSage } from "@racer-io/common";

export default class RaceCreatedSagaPublisher extends Publisher<RaceCreatedSagaEvent> {
    subject = SubjectRaceSage.raceCreatedSagaResult as const ;
}