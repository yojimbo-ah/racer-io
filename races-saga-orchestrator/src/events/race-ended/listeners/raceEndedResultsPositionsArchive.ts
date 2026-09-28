import { Listener , SubjectRaceEndedSaga , RaceEndedResultPositionsArchiveEvent, requiredServices} from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";

export default class RaceEndedResultPositionsArchiveListener extends Listener<RaceEndedResultPositionsArchiveEvent> {
    subject = SubjectRaceEndedSaga.raceEndedResultPositionsArchive as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceEndedResultPositionsArchiveEvent['data'] , msg: Message): Promise<void> {
        // logique will be added here still not yet
    }
}