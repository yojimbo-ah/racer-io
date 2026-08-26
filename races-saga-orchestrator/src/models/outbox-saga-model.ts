import mongoose, { Model, Document } from "mongoose";
import { SubjectRaceSage , Subjects , SubjectsUserCreationSaga , AllSubjectValues , AllSubjects} from "@racer-io/common";

interface OutboxEventAttrs {
    eventType: AllSubjects,
    payload: Record<string, unknown>
}

export interface OutboxEventDocument extends Document {
    eventType: AllSubjects,
    payload: Record<string, unknown>,
    published: boolean,
    publishedAt?: Date,
    createdAt: Date,
    attempts: number,
    lastError?: string
}

interface OutboxEventModel extends Model<OutboxEventDocument> {
    build(attrs: OutboxEventAttrs): OutboxEventDocument;
}

const outboxEventSchema = new mongoose.Schema({
    eventType: {
        type: String,
        enum : AllSubjectValues ,
        required: true
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    published: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    attempts: {
        type: Number,
        default: 0
    },
    lastError: {
        type: String,
        required: false
    }
})

outboxEventSchema.index({ published: 1, createdAt: 1 });
outboxEventSchema.index({ publishedAt: 1 }, { expireAfterSeconds: 3600 });

outboxEventSchema.statics.build = (attrs: OutboxEventAttrs) => {
    return new OutboxEvent(attrs);
}

const OutboxEvent = mongoose.model<OutboxEventDocument, OutboxEventModel>('OutboxEvent', outboxEventSchema);
export default OutboxEvent;