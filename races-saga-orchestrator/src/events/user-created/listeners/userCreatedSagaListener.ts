import { Listener , userCreatedEvent,  Services , Subjects } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { UserSaga, UserSagaStep} from "../../../models/user-saga-model";
import UserCreatedSagaPublisher from "../publishers/userCreatedSagaPublisher";

// entry point for this event orchetrator

export default class UserCreatedSagaListener extends Listener<userCreatedEvent> {
    queueGroupName = queueGroupName ;
    subject = Subjects.userCreated as const ;
    async onMessage(data: userCreatedEvent['data'], msg: Message): Promise<void> {
        // still didnt add the logqiue here
        // here we init the saga and we start the tracking
        const userSaga = UserSaga.build({
            userId : data.userId
        }) ;
        userSaga.completedSteps.push(UserSagaStep.USER_CREATED) ;
        userSaga.respondedServices.push(Services.auth) ; ;
        await userSaga.save() ;
        new UserCreatedSagaPublisher(this.client).publish({
            payload : data ,
            sagaId : String(userSaga._id)
        })
        msg.ack() ;
    }
}