import mongoose, { Model, Document } from "mongoose";
import { SubjectRaceSage , Subjects , SubjectsUserCreationSaga , AllSubjectValues , AllSubjects} from "@racer-io/common";
import { context, propagation } from "@opentelemetry/api";

interface OutboxEventAttrs {
    eventType: SubjectRaceSage | Subjects | SubjectsUserCreationSaga,
    payload: Record<string, unknown> ,
    // this field is used to pass the carrier 
    // to later pass it to the event so we can track it across services
    traceCarrier ?: Record<string,unknown>
}

export interface OutboxEventDocument extends Document {
    eventType: AllSubjects,
    payload: Record<string, unknown>,
    traceCarrier ?: Record<string , unknown> ,
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
    traceCarrier : {
        type : mongoose.Schema.Types.Mixed ,
        required : false
    } ,
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
// events expire and are treated by time when the relay function is called back

outboxEventSchema.index({ published: 1, createdAt: 1 });
outboxEventSchema.index({ publishedAt: 1 }, { expireAfterSeconds: 3600 });

outboxEventSchema.statics.build = (attrs: OutboxEventAttrs) => {
    const traceCarrier = attrs.traceCarrier ?? attrs.payload._traceCarrier ?? {};
    propagation.inject(context.active(), traceCarrier);

    return new OutboxEvent({
        ...attrs,
        traceCarrier
    });
}

const OutboxEvent = mongoose.model<OutboxEventDocument, OutboxEventModel>('OutboxEvent', outboxEventSchema);
export default OutboxEvent;