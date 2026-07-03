import { Publisher , Subjects , userCreatedEvent } from "@racer-io/common";

export class UserCreatedPublisher extends Publisher <userCreatedEvent>{
    subject = Subjects.userCreated as const ;
}