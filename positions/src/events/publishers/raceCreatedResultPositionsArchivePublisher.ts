import { Publisher , RaceCreatedResultPositionsArchiveEvent , SubjectRaceSage} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";

export default class RaceCreatedResultPositionsArchivePublisher extends Publisher<RaceCreatedResultPositionsArchiveEvent> {
    subject = SubjectRaceSage.raceCreatedResultPositionsArchive as const ;
}