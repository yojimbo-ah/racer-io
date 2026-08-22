import { UserSagaDocument , UserSagaStep} from "../../models/user-saga-model"
import UserCreationCancelledRacesPublisher from "./publishers/userCreationCancelledRacesPublisher"
import UserCreationCancelledArchivePublisher from "./publishers/userCreationCancelledArchivePublisher"
import UserCreatedResultSagaPublisher from "./publishers/userCreatedResultSagaPublisher"
import { natsWrapper } from "../../nats-wrapper"


// the compansation function works as the same logique as the same other componsation 
// functions of other saga orchestrators
export const componsate = async (userSaga : UserSagaDocument) => {
    if (
        userSaga.completedSteps.includes(
            UserSagaStep.USER_CREATED
        )
    ) {
        new UserCreatedResultSagaPublisher(natsWrapper.client).publish({
                sagaId : String(userSaga._id) ,
                status : false ,
                userId : userSaga.userId
        })
    }

    if (
        userSaga.completedSteps.includes(
            UserSagaStep.USER_CREATED_ARCHIVE
        )
    ) {
        new UserCreationCancelledArchivePublisher(natsWrapper.client).publish({
            sagaId : String(userSaga._id) ,
            userId : userSaga.userId
        }) ;
    }

    if (
        userSaga.completedSteps.includes(
            UserSagaStep.USER_CREATED_RACES
        )
    ) {
        new UserCreationCancelledRacesPublisher(natsWrapper.client).publish({
            sagaId : String(userSaga._id) ,
            userId : userSaga.userId
        })
    }
}