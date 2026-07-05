import { Subjects , PositionUpdatedArchiveEvent , Listener } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import Position from "../../models/positions-model";

export class PositionUpdatedAchiveListener extends Listener <PositionUpdatedArchiveEvent>{
    queueGroupName =  queueGroupName ;
    subject = Subjects.PositionUpdatedArchive as const ;
    async onMessage(data: PositionUpdatedArchiveEvent['data'] , msg: Message): Promise<void> {
        // logique to save the user positon 
        // the raceId can either be defined or not beceause it either the user
        // is in race or not
        const pos = Position.build({
            _id : data.userId ,
            ...data
        }) ;
        try {
            await pos.save() ;
        } catch (err) {
            console.log(err) ;
        }
        msg.ack() ;
    }
}