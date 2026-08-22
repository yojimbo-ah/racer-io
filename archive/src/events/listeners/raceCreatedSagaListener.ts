import { Listener , RaceCreatedSagaEvent , SubjectRaceSage , RaceStatus , Services} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Race from "../../models/race-model";
import RaceCreatedResultPositionsArchivePublisher from "../publishers/raceCreatedResultPositionsArchivePublisher";

export default class RaceCreatedSagaListener extends Listener<RaceCreatedSagaEvent> {
    subject = SubjectRaceSage.raceCreatedsaga as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceCreatedSagaEvent['data'] , msg: Message): Promise<void> {
        // create the strating event and use the try and catch blocks here
        console.log(data) ;
        try {
            const race = Race.build({
                _id : data.payload.race.raceId ,
                endingPos : data.payload.race.endPosition ,
                raceStatus : RaceStatus.RaceStared ,
                startPos : data.payload.race.startPos ,
                users : [data.payload.userData.user1 , data.payload.userData.user2] ,
            }) ;

            const res = await race.save() ;
            console.log(res) ;
            // send the event with seccess message
            new RaceCreatedResultPositionsArchivePublisher(this.client).publish({
                raceId : data.payload.race.raceId ,
                sagaId : data.sagaId ,
                service : Services.archive ,
                status : true
            })
        } catch (err) {
            new RaceCreatedResultPositionsArchivePublisher(this.client).publish({
                raceId : data.payload.race.raceId ,
                sagaId : data.sagaId ,
                service : Services.archive ,
                status : false
            })
        } finally {
            // ack in both cases
            msg.ack() ;
        }
    }
}