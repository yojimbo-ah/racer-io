import { Publisher , UserCreationCancelledArchiveEvent , SubjectsUserCreationSaga } from "@racer-io/common";

export default class UserCreationCancelledArchivePublisher extends Publisher<UserCreationCancelledArchiveEvent>{
    subject = SubjectsUserCreationSaga.UserCreationCancelledArchive as const ;
}