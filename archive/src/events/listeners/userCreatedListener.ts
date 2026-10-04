import { Listener , UserCreatedSagaEvent , SubjectsUserCreationSaga, Services ,
    UserCreatedResultRacesArchiveEvent
} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import { User } from "../../models/user-model";
import UserCreatedResultRacesArchivePublisher from "../publishers/userCreatedResultArchiveRaces";
import OutboxEvent from "../../models/outbox-model";
import { context, propagation } from "@opentelemetry/api";
import mongoose from "mongoose";
import { ATTR_HW_BATTERY_CAPACITY } from "@opentelemetry/semantic-conventions/incubating";

export default class UserCreatedListener extends Listener <UserCreatedSagaEvent> {
    subject = SubjectsUserCreationSaga.UserCreatedSaga as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data:  UserCreatedSagaEvent['data'] , msg: Message): Promise<void> {
        const user = User.build({
            _id : data.payload.userId ,
            email : data.payload.email ,
            username : data.payload.userName
        })
        const mongoSession = await mongoose.startSession() ;
        try {
            mongoSession.withTransaction(async () => {
                await user.save({session : mongoSession}) ;
                const payload : UserCreatedResultRacesArchiveEvent['data'] = {
                    sagaId : data.sagaId ,
                    service : Services.archive , 
                    status : true ,
                    userId : data.payload.userId
                } ;
                // used to pass the carrier to the event that gonna publish
                // and it just saved by the outbox model only 
                const carrier: Record<string, string> = {};
                propagation.inject(context.active(), carrier);
                await OutboxEvent.build({
                    eventType: SubjectsUserCreationSaga.UserCreatedResultRacesArchive ,
                    payload ,
                    traceCarrier : carrier
                }).save({ session: mongoSession });
            })
        } catch (err) {
            // case of failure
            await new UserCreatedResultRacesArchivePublisher(this.client).publish({
                sagaId : data.sagaId ,
                service : Services.archive ,
                status : false ,
                userId : data.payload.userId
            })
        } finally {
            await mongoSession.endSession() ;
            msg.ack() ;
        }
    }
}