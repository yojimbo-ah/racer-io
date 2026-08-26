import { Listener ,  UserCreatedSagaEvent , SubjectsUserCreationSaga , Services, UserCreatedResultRacesArchiveEvent } from "@racer-io/common";
import User from "../../models/user-model";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import UserCreatedResultRacesArchivePublisher from "../publishers/userCreatedResultArchiveRaces";
import OutboxEvent from "../../models/outbox-model";
import mongoose from "mongoose";

// we have two cases of failure the publisher is send independently of the database
// in case of failure

export class UserCreatedListener extends Listener<UserCreatedSagaEvent>{
    subject = SubjectsUserCreationSaga.UserCreatedSaga as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: UserCreatedSagaEvent['data'] , msg: Message): Promise<void> {
        try {
            const user = User.build({
                id : data.payload.userId ,
                email : data.payload.email ,
                userName : data.payload.userName
            })
            const mongoSession = await mongoose.startSession() ;
            try {
                await mongoSession.withTransaction(async () => {
                    await user.save({session : mongoSession}) ;
                    const payload : UserCreatedResultRacesArchiveEvent['data'] = {
                        sagaId : data.sagaId ,
                        service : Services.archive , 
                        status : true ,
                        userId : data.payload.userId
                    }
                    await OutboxEvent.build({
                        eventType : SubjectsUserCreationSaga.UserCreatedResultRacesArchive ,
                        payload
                    }).save({session : mongoSession}) ;
                })
            } catch (err) {
                // in case of faulire we publish the failure event
                new UserCreatedResultRacesArchivePublisher(this.client).publish({
                    sagaId : data.sagaId ,
                    service : Services.archive ,
                    status : false ,
                    userId : data.payload.userId
                })
            } finally {
                await mongoSession.endSession() ;
            }

        } catch (err) {
            // case of failure
            new UserCreatedResultRacesArchivePublisher(this.client).publish({
                sagaId : data.sagaId ,
                service : Services.archive ,
                status : false ,
                userId : data.payload.userId
            })
        } finally {
            msg.ack() ;
        }
    }
}