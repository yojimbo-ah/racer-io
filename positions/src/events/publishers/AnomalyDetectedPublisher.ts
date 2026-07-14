import { Publisher , AnomalyDetectedEvent , Subjects } from "@racer-io/common";

export default class AnomalyDetectedPublisher extends Publisher<AnomalyDetectedEvent> {
    subject = Subjects.AnomalyDetected as const ;
}