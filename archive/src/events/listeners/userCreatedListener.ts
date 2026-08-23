import { Listener , UserCreatedSagaEvent , SubjectsUserCreationSaga, Services} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import { User } from "../../models/user-model";
import UserCreatedResultRacesArchivePublisher from "../publishers/userCreatedResultArchiveRaces";

export default class UserCreatedListener extends Listener <UserCreatedSagaEvent> {
    subject = SubjectsUserCreationSaga.UserCreatedSaga as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data:  UserCreatedSagaEvent['data'] , msg: Message): Promise<void> {
        try {
            const user = User.build({
                _id : data.payload.userId ,
                email : data.payload.email ,
                username : data.payload.userName
            })
            await user.save() ;
            // case of success
            new UserCreatedResultRacesArchivePublisher(this.client).publish({
                sagaId : String(user._id) ,
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