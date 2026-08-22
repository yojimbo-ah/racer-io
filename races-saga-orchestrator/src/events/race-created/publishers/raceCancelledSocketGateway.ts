import { Publisher , RaceCreatedCancelledSocketGateway , SubjectRaceSage } from "@racer-io/common";

export default class RaceCancelledSocketgatewayPublisher extends Publisher<RaceCreatedCancelledSocketGateway> {
    subject = SubjectRaceSage.raceCreatedCancelledSocketGateway as const ;
}