import { Listener , RaceStatus , RaceEndedSagaEvent, SubjectRaceEndedSaga , Services} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Race from "../../models/race-model";
import RaceEndedResultPositionsArchivePublisher from "../publishers/raceEndedResultPositionsArchive";

// change it to listen to another even not this event 
// the event to listen to is : RaceEndedSagaEvent

// for now we still didnt add the outbox pattren into the archive service
// and i still didnt add transactions id add them later currently i wll not 
// make it atomic (might cause problems) ;
// the setup is fragile i wll improve it in the future of course
export class RaceFinishedListener extends Listener <RaceEndedSagaEvent>{
    queueGroupName =  queueGroupName ;
    subject = SubjectRaceEndedSaga.raceEndedsaga as const ;
    async onMessage(data: RaceEndedSagaEvent['data'], msg: Message): Promise<void> {
        // logique to save the user positon
        try {
            const race = await Race.findById(data.payload.race.raceId) ;
            if (!race) {
                throw new Error('error happened') ;
            }

            race.winner = data.payload.userData.winner ;
            race.raceStatus = RaceStatus.RaceEnded ;

            await race.save() ;
            // success event here
            new RaceEndedResultPositionsArchivePublisher(this.client).publish({
                raceId : data.payload.race.raceId ,
                sagaId : data.sagaId ,
                service : Services.archive ,
                status : true
            })
        } catch (err) {
            console.log(err) ;
            // failure event here 
            new RaceEndedResultPositionsArchivePublisher(this.client).publish({
                raceId : data.payload.race.raceId ,
                sagaId : data.sagaId ,
                service : Services.archive ,
                status : false
            })
        } finally {
            msg.ack(); 
        }
    }
}