import mongoose, { Model, Document } from 'mongoose';
import { Services } from '@racer-io/common';
import { SagaStatus } from './race-saga-model';


export enum SagaStep {
    RACE_ENDED = 'RACE_ENDED',
    POSITIONS_ENDED = 'RACE_POSITIONS_ENDED',
    ARCHIVE_ENDED = 'RACE_ARCHIVE_ENDED' ,
}
export const Steps = Object.values(SagaStep);

interface RaceEndedSagaAttrs {
    raceId: string;

}

export interface RaceEndedSagaDocument extends Document {
    raceId: string;
    status: SagaStatus;
    completedSteps: SagaStep[];
    respondedServices : Services []
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface RaceEndedSagaModel extends Model<RaceEndedSagaDocument> {
    build(attrs: RaceEndedSagaAttrs): RaceEndedSagaDocument;
}

const raceEndedSagaSchema = new mongoose.Schema({
    raceId: {
        type: String,
        ref: 'Race',
        required: true,
        index: true, // you'll query "find the saga for this race" often
    } ,
    status: {
        type: String,
        enum: Object.values(SagaStatus),
        default: SagaStatus.PENDING,
    },
    completedSteps: [{
        type: String,
        enum: Object.values(SagaStep),
        default : []
    }],
    respondedServices : [{
        type : String ,
        // the services allowed to repspond to the saga serice and write in
        // this record
        enum : [Services.archive , Services.positions , Services.races] ,
        default : []
    }] ,
    error: {
        type: String,
        required: false,
    },
}, { timestamps: true });

raceEndedSagaSchema.statics.build = (attrs: RaceEndedSagaAttrs) => {
    return new RaceEndedSaga(attrs);
};

export const RaceEndedSaga = mongoose.model<RaceEndedSagaDocument, RaceEndedSagaModel>('RaceEndedSaga', raceEndedSagaSchema);