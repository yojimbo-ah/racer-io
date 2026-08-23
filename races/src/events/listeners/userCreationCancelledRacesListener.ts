import { Listener , UserCreationCancelledRacesEvent , SubjectsUserCreationSaga } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import User from "../../models/user-model";


export default class UserCreationCancelledRacesListener extends Listener <UserCreationCancelledRacesEvent> {
    subject = SubjectsUserCreationSaga.UserCreationCancelledRaces as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: UserCreationCancelledRacesEvent['data'] , msg: Message): Promise<void> {
        await User.findByIdAndDelete(data.userId) ;
        msg.ack() ;
    }
}