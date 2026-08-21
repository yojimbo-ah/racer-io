import { Subjects , RaceCancelledEvent , Listener, RaceStatus } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Race from "../../models/race-model";


export class RaceCancelledListener extends Listener <RaceCancelledEvent>{
    queueGroupName =  queueGroupName ;
    subject = Subjects.RaceCancelled as const ;
    async onMessage(data: RaceCancelledEvent['data'] , msg: Message): Promise<void> {
        // logique to save the user positon 
        const race = await Race.findById(data.race.raceId) ;
        try {
            if (!race) {
                throw new Error('coulndt find the race')
            }
            race.raceStatus = RaceStatus.RaceCancelled ;
            await race.save() ;
        } catch (err) {
            console.log(err) ;
            throw new Error('error happened') ;
        }
        msg.ack() ;
    }
}