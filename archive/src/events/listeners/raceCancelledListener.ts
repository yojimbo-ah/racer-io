import { Subjects , RaceCancelledEvent , Listener, RaceStatus } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Race from "../../models/race-model";


export class RaceCancelledListener extends Listener <RaceCancelledEvent>{
    queueGroupName =  queueGroupName ;
    subject = Subjects.RaceCancelled as const ;
    async onMessage(data: RaceCancelledEvent['data'] , msg: Message): Promise<void> {
        // logique to save the user positon 
        const race = Race.build({
            users : [data.userData.user1 , data.userData.user2] ,
            endingPos : data.race.endPosition ,
            startPos : data.race.startPos ,
            _id : data.race.raceId ,
            raceStatus : RaceStatus.RaceCancelled
        })
        try {
            
            await race.save() ;
        } catch (err) {
            console.log(err) ;
            throw new Error('error happened') ;
        }
        msg.ack() ;
    }
}