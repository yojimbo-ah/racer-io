import { Publisher , Subjects , RaceStartedEvent } from "@racer-io/common";

export class RaceStartedPublisher extends Publisher <RaceStartedEvent> {
    subject = Subjects.RaceStarted as const ;
}