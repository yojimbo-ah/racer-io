import { Listener , userCreatedEvent,  Services , Subjects, UserCreatedSagaEvent, SubjectsUserCreationSaga } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { UserSaga, UserSagaStep} from "../../../models/user-saga-model";
import OutboxEvent from "../../../models/outbox-saga-model";
import mongoose from "mongoose";
import UserCreatedResultSagaPublisher from "../publishers/userCreatedResultSagaPublisher";

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
        userSaga.respondedServices.push(Services.auth) ; 
        const mongoSession = await mongoose.startSession() ;
        try {
            await mongoSession.withTransaction(async () => {
                await userSaga.save({session : mongoSession}) ;
                const payload : UserCreatedSagaEvent['data'] = {
                    sagaId : String(userSaga._id) ,
                    payload : data
                } ;
                await OutboxEvent.build({
                    eventType : SubjectsUserCreationSaga.UserCreatedSaga ,
                    payload,
                    traceCarrier: (data as any)._traceCarrier
                }).save({session : mongoSession}) ;
            })
        } catch (err) {
            // send back the request to the service to tell her it didnt reach the other services
                await new UserCreatedResultSagaPublisher(this.client).publish({
                sagaId : String(userSaga._id) ,
                status : false ,
                userId : data.userId
            })
        } finally {
            await mongoSession.endSession() ;
            msg.ack() ;
        }
    }
}