import { Publisher ,  SubjectRaceSage , RaceCreatedSagaResultEvent} from "@racer-io/common";


export default class RaceCreatedResultSagaPublisher extends Publisher<RaceCreatedSagaResultEvent> {
    subject = SubjectRaceSage.raceCreatedSagaResult as const ;
}