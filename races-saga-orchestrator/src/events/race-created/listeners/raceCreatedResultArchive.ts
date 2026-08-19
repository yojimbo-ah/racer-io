import { Listener , SubjectRaceSage , RaceCreatedResultArchiveEvent } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";

// the logique to treat the result back from the archive service
// treated under the saga orchestrator logique

export default class RaceCreatedResultArchiveListener extends Listener<RaceCreatedResultArchiveEvent>{
    queueGroupName = queueGroupName ;
    subject = SubjectRaceSage.raceCreatedResultArchive as const ;
    async onMessage(data: RaceCreatedResultArchiveEvent['data'], msg: Message): Promise<void> {
        // still didnt create the logique here
           
    }
}