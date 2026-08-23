import { Listener , UserCreatedSagaEvent , SubjectsUserCreationSaga} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";

export default class UserCreatedListener extends Listener <UserCreatedSagaEvent> {
    subject = SubjectsUserCreationSaga.UserCreatedSaga as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data:  UserCreatedSagaEvent['data'] , msg: Message): Promise<void> {
        try {

        } catch (err) {

        } finally {
            msg.ack() ;
        }
    }
}