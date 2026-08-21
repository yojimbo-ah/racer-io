import { Publisher , RaceCreatedResultPositionsArchiveEvent , SubjectRaceSage } from "@racer-io/common";

export default class RaceCreatedResultPositionsArchivePublisher extends Publisher<RaceCreatedResultPositionsArchiveEvent> {
    subject = SubjectRaceSage.raceCreatedResultPositionsArchive as const ;
}