import { Publisher , Subjects , RaceAwaitingEvent } from "@racer-io/common";

export class RaceAwaitingPublisher extends Publisher<RaceAwaitingEvent> {
    subject = Subjects.RaceAwaitng as const ;
}

// this will trigger a socket response in the positions service