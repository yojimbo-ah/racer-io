import { UserSagaDocument, UserSagaStep } from "../../models/user-saga-model";
import { ClientSession } from "mongoose";
import OutboxEvent from "../../models/outbox-saga-model";
import { SubjectsUserCreationSaga } from "@racer-io/common"; // adjust to your actual subject enum
import { context, propagation } from "@opentelemetry/api";

// the compensation function works as the same logic as the other compensation
// functions of other saga orchestrators
export const componsate = async (userSaga: UserSagaDocument, session: ClientSession) => {
    await userSaga.save({ session });

    const traceCarrier: Record<string, string> = {};
    propagation.inject(context.active(), traceCarrier);
    const events: { eventType: string; payload: any; traceCarrier: Record<string, string> }[] = [];

    if (userSaga.completedSteps.includes(UserSagaStep.USER_CREATED)) {
        events.push({
            eventType: SubjectsUserCreationSaga.UserCreatedSagaResult,
            payload: {
                sagaId: String(userSaga._id),
                status: false,
                userId: userSaga.userId
            },
            traceCarrier
        });
    }

    if (userSaga.completedSteps.includes(UserSagaStep.USER_CREATED_ARCHIVE)) {
        events.push({
            eventType: SubjectsUserCreationSaga.UserCreationCancelledArchive,
            payload: {
                sagaId: String(userSaga._id),
                userId: userSaga.userId
            },
            traceCarrier
        });
    }

    if (userSaga.completedSteps.includes(UserSagaStep.USER_CREATED_RACES)) {
        events.push({
            eventType: SubjectsUserCreationSaga.UserCreationCancelledRaces,
            payload: {
                sagaId: String(userSaga._id),
                userId: userSaga.userId
            },
            traceCarrier
        });
    }

    if (events.length) {
        await OutboxEvent.insertMany(
            events,
            { session }
        );
    }
};