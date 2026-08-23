import { Listener ,  UserCreatedSagaEvent , SubjectsUserCreationSaga , Services } from "@racer-io/common";
import User from "../../models/user-model";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import UserCreatedResultRacesArchivePublisher from "../publishers/userCreatedResultArchiveRaces";

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
            await user.save() ;
            // case of success
            new UserCreatedResultRacesArchivePublisher(this.client).publish({
                sagaId : data.sagaId ,
                service : Services.archive , 
                status : true ,
                userId : data.payload.userId
            })

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