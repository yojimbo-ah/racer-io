import mongoose, { Model, Document } from 'mongoose';


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
    PREDICTIONS_STARTED = 'PREDICTIONS_STARTED',
}

interface RaceSagaAttrs {
    raceId: mongoose.Types.ObjectId;
}

interface RaceSagaDocument extends Document {
    raceId: mongoose.Types.ObjectId;
    status: SagaStatus;
    completedSteps: SagaStep[];
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface RaceSagaModel extends Model<RaceSagaDocument> {
    build(attrs: RaceSagaAttrs): RaceSagaDocument;
}

const raceSagaSchema = new mongoose.Schema({
    raceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Race',
        required: true,
        index: true, // you'll query "find the saga for this race" often
    },
    status: {
        type: String,
        enum: Object.values(SagaStatus),
        default: SagaStatus.PENDING,
    },
    completedSteps: [{
        type: String,
        enum: Object.values(SagaStep),
    }],
    error: {
        type: String,
        required: false,
    },
}, { timestamps: true });

raceSagaSchema.statics.build = (attrs: RaceSagaAttrs) => {
    return new RaceSaga(attrs);
};

export const RaceSaga = mongoose.model<RaceSagaDocument, RaceSagaModel>('RaceSaga', raceSagaSchema);