import { Publisher , SubjectRaceSage , RaceCancelledArchiveEvent } from "@racer-io/common";

export default class RaceCancelledArchivePublisher extends Publisher<RaceCancelledArchiveEvent> {
    subject = SubjectRaceSage.raceCancelledArchive as const ;
}