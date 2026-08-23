import { Listener , SubjectsUserCreationSaga , UserCreatedSagaResultEvent } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import User from "../../models/user-model";
import Session from "../../models/session";
import blacklistRedis from "../../blacklistRedis";
import { ExpirationNum } from "../../consts/jwt-access-time";

export default class UserCreatedSagaResultListener extends Listener<UserCreatedSagaResultEvent> {
    subject = SubjectsUserCreationSaga.UserCreatedSagaResult as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: UserCreatedSagaResultEvent['data'], msg: Message): Promise<void> {
        if (!data.status) {
            await User.findByIdAndDelete(data.userId) ;
            await Session.findOneAndDelete({userId : data.userId}) ;
            // black list the user for 15 minutes with there id 
            // bceause the app doesnt allow two users signing up
            // with the same account at the same time so it will work to use
            // black list
            await blacklistRedis.blacklistUser(data.userId , ExpirationNum.access / 1000) ;

        }
        msg.ack() ;
    }
}