import { Publisher , Subjects , RaceCancelledEvent } from "@racer-io/common";

export class RaceCancelledPublisher extends Publisher<RaceCancelledEvent> {
    subject = Subjects.RaceCancelled as const ;
}

// this will trigger a socket response in the positions service