import mongoose, { Model, Document } from 'mongoose';
import { Services } from '@racer-io/common';

// will move them to the common library 

export enum SagaStatus {
    PENDING = 'PENDING',
    COMPLETE = 'COMPLETE',
    COMPENSATING = 'COMPENSATING',
    FAILED = 'FAILED',
    COMPENSATION_FAILED = 'COMPENSATION_FAILED',
}


export enum SagaStep {
    RACE_CREATED = 'RACE_CREATED',
    POSITIONS_INITIALIZED = 'POSITIONS_INITIALIZED',
    RACE_ARCHIVED = 'RACE_ARCHIVED' ,
}
export const Steps = Object.values(SagaStep);

interface RaceSagaAttrs {
    raceId: string;
    users : string [] ;
}

export interface RaceSagaDocument extends Document {
    raceId: string;
    status: SagaStatus;
    users : string [] ;
    completedSteps: SagaStep[];
    respondedServices : Services []
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface RaceSagaModel extends Model<RaceSagaDocument> {
    build(attrs: RaceSagaAttrs): RaceSagaDocument;
}

const raceSagaSchema = new mongoose.Schema({
    raceId: {
        type: String,
        ref: 'Race',
        required: true,
        index: true, // you'll query "find the saga for this race" often
    },
    users : [{
        type : String ,
        default : []
    }] ,
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

raceSagaSchema.statics.build = (attrs: RaceSagaAttrs) => {
    return new RaceSaga(attrs);
};

export const RaceSaga = mongoose.model<RaceSagaDocument, RaceSagaModel>('RaceSaga', raceSagaSchema);