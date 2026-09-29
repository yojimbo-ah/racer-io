// in case in failure when ending the race we will just remove the race from the db 
// might improve the logique in the future of course

import { Listener , RaceEndedCancelledArchiveEvent , SubjectRaceEndedSaga , RaceStatus} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Race from "../../models/race-model";

export default class RaceEndedCancelledArchiveListener extends Listener <RaceEndedCancelledArchiveEvent> {
    subject = SubjectRaceEndedSaga.raceEndedCancelledArchive as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceEndedCancelledArchiveEvent['data'] , msg: Message): Promise<void> {
        // this will not use try and catch beceause we need it to keep firing in case
        // of failure until it reached the maximum repeated allowed times until a manual 
        // access is done to fix it
        const race = await Race.findById(data.raceId) ;
        if (!race) {
            throw new Error('Couldnt find the right race') ;
        }
        race.raceStatus = RaceStatus.RaceCancelled ;
        await race.save() ;
        msg.ack() ;

    }
}