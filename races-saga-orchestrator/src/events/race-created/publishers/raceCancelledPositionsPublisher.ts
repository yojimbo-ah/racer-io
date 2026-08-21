import { Publisher , RaceCancelledPositionsEvent , SubjectRaceSage } from "@racer-io/common";

export default class RaceCancelledPositionsPublisher extends Publisher<RaceCancelledPositionsEvent>{
    subject = SubjectRaceSage.raceCancelledPositions as const ;
}