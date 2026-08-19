import { RaceSagaDocument , SagaStatus , SagaStep } from "../../models/race-saga-model";


const componsate = async (raceSaga: RaceSagaDocument) => {

    raceSaga.status = SagaStatus.COMPENSATING;
    await raceSaga.save();

    if (
        raceSaga.completedSteps.includes(
            SagaStep.POSITIONS_INITIALIZED
        )
    ) {
        // still ddint add the logique here
    }

    if (
        raceSaga.completedSteps.includes(
            SagaStep.RACE_CREATED
        )
    ) {
        // still didnt add the logique here
    }
}