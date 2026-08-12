import { Publisher , Subjects , UserDisConnectedEvent } from "@racer-io/common";

export default class UserDisConnectedPublisher extends Publisher <UserDisConnectedEvent> {
    subject = Subjects.userDisConnected as const ;
}