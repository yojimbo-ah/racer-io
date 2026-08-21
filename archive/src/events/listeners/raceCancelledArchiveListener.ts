import { Listener , SubjectRaceSage , RaceCancelledArchiveEvent} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Race from "../../models/race-model";

export default class RaceCancelledArchiveListener extends Listener<RaceCancelledArchiveEvent> {
    subject = SubjectRaceSage.raceCancelledArchive as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceCancelledArchiveEvent['data'] , msg: Message): Promise<void> {
        // remove the race that teh service has saved 
        // dont use try and catch so the evnt is resended if it fails the 
        // first time
        await Race.findByIdAndDelete(data.raceId) ;
        msg.ack() ;
    }
}