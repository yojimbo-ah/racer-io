import { Publisher , Subjects , RaceFinishedEvent } from "@racer-io/common";

export class RaceFinishedPublisher extends Publisher<RaceFinishedEvent> {
    subject = Subjects.RaceFinished as const ;
}