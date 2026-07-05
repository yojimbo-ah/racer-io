import { Publisher , PositionUpdatedArchiveEvent , Subjects } from "@racer-io/common";

export class PositionUpdatedAchivePublisher extends Publisher <PositionUpdatedArchiveEvent>{
    subject = Subjects.PositionUpdatedArchive as const ;
}