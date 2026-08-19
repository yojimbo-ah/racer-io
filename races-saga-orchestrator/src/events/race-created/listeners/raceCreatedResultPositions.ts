import { Listener , SubjectRaceSage , RaceCreatedResultPositionsEvent } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";


export default class RaceCreatedResultPositionsListener extends Listener <RaceCreatedResultPositionsEvent>{
    subject = SubjectRaceSage.raceCreatedResultPositions as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceCreatedResultPositionsEvent['data'], msg: Message): Promise<void> {
        // still didnt add the logique here
        
    }
}