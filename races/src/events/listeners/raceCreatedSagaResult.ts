import { Listener , RaceCreatedSagaResultEvent , SubjectRaceSage , RaceStatus} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Race from "../../models/race-model";

export default class RaceCreatedSagaResultListener extends Listener<RaceCreatedSagaResultEvent> {
    queueGroupName = queueGroupName ;
    subject = SubjectRaceSage.raceCreatedSagaResult as const ;
    async onMessage(data: RaceCreatedSagaResultEvent['data'], msg: Message): Promise<void> {
        // in case of fuilure we delete the race that we started 
        if (!data.status) {
            // the case of failure
            // delete the race docuemnt
            // ,ay change it in the future to make it such it shows that 
            // the race starting failed
            const race = await Race.findById(data.raceId);
            if (!race) {
                throw new Error('couldnt find the right data needed')
            }
            race.raceStatus = RaceStatus.RaceCancelled ;
            await race.save() ;
        }
        // ack the mesage in both ways

        msg.ack() ;
    }
}