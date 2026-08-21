import { Subjects , RaceFinishedEvent , Listener , RaceStatus} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Race from "../../models/race-model";


export class RaceFinishedListener extends Listener <RaceFinishedEvent>{
    queueGroupName =  queueGroupName ;
    subject = Subjects.RaceFinished as const ;
    async onMessage(data: RaceFinishedEvent['data'] , msg: Message): Promise<void> {
        // logique to save the user positon
        const race = await Race.findById(data.race.raceId) ;
        if (!race) {
            throw new Error('error happened') ;
        }

        race.winner = data.userData.winner ;
        race.raceStatus = RaceStatus.RaceEnded ;
        try {
            await race.save() ;
        } catch (err) {
            console.log(err) ;
            throw new Error('error happened') ;
        }

        msg.ack() ;
    }
}