import { Publisher , UserCreatedSagaEvent , SubjectsUserCreationSaga } from "@racer-io/common";

export default class UserCreatedSagaPublisher extends Publisher<UserCreatedSagaEvent> {
    subject = SubjectsUserCreationSaga.UserCreatedSaga as const ;
}