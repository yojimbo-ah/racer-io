import { Publisher , UserCreationCancelledRacesEvent , SubjectsUserCreationSaga } from "@racer-io/common";

export default class UserCreationCancelledRacesPublisher extends Publisher<UserCreationCancelledRacesEvent> {
    subject = SubjectsUserCreationSaga.UserCreationCancelledRaces as const ;
}