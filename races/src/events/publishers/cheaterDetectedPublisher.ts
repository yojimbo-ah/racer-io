import { Publisher , Subjects , CheaterDetectedEvent } from "@racer-io/common";

export default class CheaterDetectedPublisher extends Publisher<CheaterDetectedEvent> {
    subject = Subjects.CheaterDetected as const ;
}