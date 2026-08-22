import { Listener , UserCreatedResultRacesArchiveEvent , SubjectsUserCreationSaga, Services } from "@racer-io/common";
import queueGroupName from "../../queueGroupName";
import { Message } from "node-nats-streaming";
import { UserSaga , UserSagaStep , userSteps} from "../../../models/user-saga-model";
import UserCreatedResultSagaPublisher from "../publishers/userCreatedResultSagaPublisher";
import { componsate } from "../componsate";

// we check the length only beceause we need 3 events so if they were 
// all treated then we must notify the auth service that  everything went 
// alright

export default class UserCreatedResultRacesArchiveListener extends Listener<UserCreatedResultRacesArchiveEvent>{
    subject = SubjectsUserCreationSaga.UserCreatedResultRacesArchive as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: UserCreatedResultRacesArchiveEvent['data'] , msg: Message): Promise<void> {
        // still didnt create the logique here
        if (data.status) {
            const userSaga = await UserSaga.findById(data.sagaId) ;
            if (!userSaga) throw new Error('Couldnt find the right saga record') ;
            if (data.service === Services.archive) {
                userSaga.respondedServices.push(data.service) ;
                userSaga.completedSteps.push(UserSagaStep.USER_CREATED_ARCHIVE)
            } ;

            if (data.service === Services.races) {
                userSaga.respondedServices.push(data.service) ;
                userSaga.completedSteps.push(UserSagaStep.USER_CREATED_RACES) ;
            } ;
            await userSaga.save() ;
            // if all the events had been complted then we send the result as succes 
            if (userSaga.completedSteps.length === userSteps.length) {
                // this case all the services responded and the all treated
                // the data correctly
                new UserCreatedResultSagaPublisher(this.client).publish({
                    sagaId : String(userSaga._id) ,
                    status : true ,
                    userId : userSaga.userId
                })
            } else if (userSaga.respondedServices.length === userSteps.length) {
                // the we will componsate in this case because the
                // all services reponded but not all of them we succes
                // exp ( success , fail , success this section of the code will run)
                componsate(userSaga) ; 
            }
            msg.ack() ;
        } else {
            const userSaga = await UserSaga.findById(data.sagaId) ;
            if (!userSaga) return msg.ack() ;

            userSaga.respondedServices.push(data.service) ;
            await userSaga.save() ;
            if (userSaga.respondedServices.length === userSteps.length) {
                // this section of the code will run if at least the last 
                // event treated was a failure
                await componsate(userSaga) ;
            }
            msg.ack() ;

        }
    }

}