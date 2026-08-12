import { Publisher , Subjects , UserConnectedEvent } from "@racer-io/common";

export default class UserConnectedPublisher extends Publisher<UserConnectedEvent> {
    subject = Subjects.userConnected as const ;
}