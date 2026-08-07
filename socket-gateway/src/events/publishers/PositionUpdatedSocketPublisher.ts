import {Publisher , Subjects , PositionUpdatedSocketEvent } from "@racer-io/common"

export default class PositionUpdatedSocketPublisher extends Publisher<PositionUpdatedSocketEvent>{
    subject = Subjects.PositionUpdatedSocket as const ;
}