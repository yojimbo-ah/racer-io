import { RaceSagaDocument , SagaStatus , SagaStep } from "../../models/race-saga-model";
import RaceCancelledArchivePublisher from "./publishers/raceCancelledArchivePublisher";
import RaceCancelledPositionsPublisher from "./publishers/raceCancelledPositionsPublisher";
import RaceCreatedResultSagaPublisher from "./publishers/raceCreatedResultSagaPublisher";
import RaceCancelledSocketgatewayPublisher from "./publishers/raceCancelledSocketGateway";
import { natsWrapper } from "../../nats-wrapper";

// this function cancelles the events that had been succefully been taited by the services
// in case of failure of single one at least

export const componsate = async (raceSaga: RaceSagaDocument) => {

    raceSaga.status = SagaStatus.COMPENSATING;
    await raceSaga.save();

    if (
        raceSaga.completedSteps.includes(
            SagaStep.POSITIONS_INITIALIZED
        )
    ) {
        new RaceCancelledPositionsPublisher(natsWrapper.client).publish({
            raceId : raceSaga.raceId ,
            sagaId : String(raceSaga._id) ,
            users : {
                user1 : raceSaga.users[0] ,
                user2 : raceSaga.users[1]
            }
        })
    }

    if (
        raceSaga.completedSteps.includes(
            SagaStep.RACE_ARCHIVED
        )
    ) {
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
        // we use status false to tell the service that the saga orchesteration
        // failed
        new RaceCreatedResultSagaPublisher(natsWrapper.client).publish({
            status : false ,
            raceId : raceSaga.raceId
        })
    }
    // no matter the context we always send a publish to the socket-service to 
    // let the users know that the race had been cancelled

    new RaceCancelledSocketgatewayPublisher(natsWrapper.client).publish({
        raceId : raceSaga.raceId ,
        status : false, 
        users : raceSaga.users
    })
}