import mongoose, { Model, Document } from 'mongoose';
import { SagaStatus } from './race-saga-model';
import { Services } from '@racer-io/common';

// will move them to the common library 



export enum UserSagaStep {
    USER_CREATED = 'USER_CREATED' ,
    USER_CREATED_ARCHIVE = 'USER_CREATED_ARCHIVE' ,
    USER_CREATED_RACES = 'USER_CREATED_RACES'
}
export const userSteps = Object.values(UserSagaStep);

interface UserSagaAttrs {
    userId: string;
}

export interface UserSagaDocument extends Document {
    userId: string;
    status: SagaStatus;
    completedSteps: UserSagaStep [];
    respondedServices : Services [] ;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface UserSagaModel extends Model<UserSagaDocument> {
    build(attrs: UserSagaAttrs): UserSagaDocument;
}

const userSagaSchema = new mongoose.Schema({
    userId: {
        type: String,
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
        enum: Object.values(UserSagaStep),
    }],
    respondedServices : [{
        type : String ,
        // allowed services
        enum : [Services.auth , Services.archive , Services.races] ,
        default : []
    }] ,
    error: {
        type: String,
        required: false,
    },
}, { timestamps: true });

userSagaSchema.statics.build = (attrs: UserSagaAttrs) => {
    return new UserSaga(attrs);
};

export const UserSaga = mongoose.model<UserSagaDocument, UserSagaModel>('UserSaga', userSagaSchema);