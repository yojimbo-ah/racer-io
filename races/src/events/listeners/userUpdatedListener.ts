import { Listener , Subjects , userUpdatedEvent } from "@racer-io/common";
import User from "../../models/user-model";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";

export class UserUpdatedListener extends Listener<userUpdatedEvent> {
    queueGroupName = queueGroupName ;
    subject = Subjects.userUpdated as const ;
    async onMessage(data: userUpdatedEvent['data'] , msg: Message): Promise<void> {
        const user = await User.findById(data.userId) ;
        if (!user) {
            throw new Error('Coulndt find the right user') ;
        }

        user.userName = data.userName ;
        await user.save() ;
        msg.ack() ;
    }
}