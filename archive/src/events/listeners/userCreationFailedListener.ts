import { Listener , UserCreationCancelledArchiveEvent , SubjectsUserCreationSaga } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import { User } from "../../models/user-model";

export default class UserCreationCancelledArchiveListener extends Listener<UserCreationCancelledArchiveEvent> {
    queueGroupName = queueGroupName ;
    subject = SubjectsUserCreationSaga.UserCreationCancelledArchive as const ;
    async onMessage(data: UserCreationCancelledArchiveEvent['data'], msg: Message): Promise<void> {
        await User.findByIdAndDelete(data.userId) ;
        msg.ack() ;
    }
}