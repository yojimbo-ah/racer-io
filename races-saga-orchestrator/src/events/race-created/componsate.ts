import { RaceSagaDocument , SagaStatus , SagaStep } from "../../models/race-saga-model";
import RaceCancelledArchivePublisher from "./publishers/raceCancelledArchivePublisher";
import RaceCancelledPositionsPublisher from "./publishers/raceCancelledPositionsPublisher";
import { natsWrapper } from "../../nats-wrapper";


export const componsate = async (raceSaga: RaceSagaDocument) => {

    raceSaga.status = SagaStatus.COMPENSATING;
    await raceSaga.save();

    if (
        raceSaga.completedSteps.includes(
            SagaStep.POSITIONS_INITIALIZED
        )
    ) {
        // still ddint add the logique here
        new RaceCancelledArchivePublisher(natsWrapper.client).publish({
            raceId : raceSaga.raceId ,
            sagaId : String(raceSaga._id) ,

        })
    }

    if (
        raceSaga.completedSteps.includes(
            SagaStep.RACE_CREATED
        )
    ) {
        // still didnt add the logique here
        new RaceCancelledPositionsPublisher(natsWrapper.client).publish({
            raceId : raceSaga.raceId ,
            sagaId : String(raceSaga._id) ,
            users : {
                user1 : raceSaga.users[0] ,
                user2 : raceSaga.users[1]
            }
        })
    }
}