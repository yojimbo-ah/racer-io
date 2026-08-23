import { Publisher , SubjectsUserCreationSaga , UserCreatedResultRacesArchiveEvent } from "@racer-io/common";

export default class UserCreatedResultRacesArchivePublisher extends Publisher<UserCreatedResultRacesArchiveEvent> {
    subject = SubjectsUserCreationSaga.UserCreatedResultRacesArchive as const ;
}