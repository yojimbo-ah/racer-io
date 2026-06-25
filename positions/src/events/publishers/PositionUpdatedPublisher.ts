import {Publisher , Subjects , PositionUpdatedEvent} from "@racer-io/common"

export default class PositionUpdatedPublisher extends Publisher<PositionUpdatedEvent>{
    subject = Subjects.PositionUpdated as const ;
}