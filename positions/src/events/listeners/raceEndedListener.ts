import { Listener , Subjects ,  Position, RaceStatus, userStatus ,
     RaceEndedSagaEvent, SubjectRaceEndedSaga , Services} from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import redis from "../../redis";
import { POSITION_DATA_EXPIRY_TIME } from "../../../consts/expiry-times";
import RaceEndedResultPositionsArchivePublisher from "../publishers/raceEndedResultsPositionsArchivePublisher";

// change the event here also to the new event 
// this will be the input to the saga orchestration service not 
// these services 

export class RaceFinishedListener extends Listener<RaceEndedSagaEvent> {
    subject = SubjectRaceEndedSaga.raceEndedsaga as const ;
    queueGroupName = queueGroupName; 
    async onMessage(data: RaceEndedSagaEvent['data'] , msg: Message): Promise<void> {
        const pipeline = redis.pipeline() ;

        pipeline.hset(`user:${data.payload.userData.user1}` , {
            status : userStatus.Idle
        }) ;
        pipeline.expire(`user:${data.payload.userData.user1}` , POSITION_DATA_EXPIRY_TIME) ;

        pipeline.hset(`user:${data.payload.userData.user2}` , {
            status : userStatus.Idle
        }) ;
        pipeline.expire(`user:${data.payload.userData.user2}` , POSITION_DATA_EXPIRY_TIME) ;
        try {
            await pipeline.exec() ;
            new RaceEndedResultPositionsArchivePublisher(this.client).publish({
                raceId : data.payload.race.raceId ,
                sagaId : data.sagaId ,
                service : Services.positions ,
                status : true
            })
        } catch (err) {
            new RaceEndedResultPositionsArchivePublisher(this.client).publish({
                raceId : data.payload.race.raceId ,
                sagaId : data.sagaId ,
                service : Services.positions ,
                status : false
            })
        } finally {
            msg.ack() ;
        }


    }
}