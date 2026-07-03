import { Listener , userCreatedEvent , Subjects } from "@racer-io/common";
import User from "../../models/user-model";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";

export class UserCreatedListener extends Listener<userCreatedEvent>{
    subject = Subjects.userCreated as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: userCreatedEvent['data'] , msg: Message): Promise<void> {
        const user = User.build({
            id : data.userId ,
            ...data
        }) ;
        await user.save() ;

        msg.ack() ;
    }
}