import { Publisher , Subjects , userUpdatedEvent } from "@racer-io/common";

export class UserUpdatedPublisher extends Publisher <userUpdatedEvent>{
    subject = Subjects.userUpdated as const ;
}