import { Publisher , SubjectsUserCreationSaga , UserCreatedSagaResultEvent } from "@racer-io/common";

export default class UserCreatedResultSagaPublisher extends Publisher<UserCreatedSagaResultEvent> {
    subject = SubjectsUserCreationSaga.UserCreatedSagaResult as const ;
}