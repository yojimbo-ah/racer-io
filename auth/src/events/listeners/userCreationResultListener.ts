import { Listener , SubjectsUserCreationSaga , UserCreatedSagaResultEvent } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import User from "../../models/user-model";
import Session from "../../models/session";

export default class UserCreatedSagaResultListener extends Listener<UserCreatedSagaResultEvent> {
    subject = SubjectsUserCreationSaga.UserCreatedSagaResult as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: UserCreatedSagaResultEvent['data'], msg: Message): Promise<void> {
        if (!data.status) {
            await User.findByIdAndDelete(data.userId) ;
            await Session.findOneAndDelete({userId : data.userId}) ;
            // currently the access token will still be valid even tho
            // the user doesnt exist (for 15min)
            // so we must add a block list in redis database to not 
            // allow this to happen , will not do it today
        }
        msg.ack() ;
    }
}