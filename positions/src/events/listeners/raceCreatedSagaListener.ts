// this is the race Creation from the saga srevice 
// for the creation of new race
import { Listener , RaceCreatedSagaEvent ,  SubjectRaceSage , userStatus , Services } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import redis from "../../redis";
import { POSITION_DATA_EXPIRY_TIME } from "../../../consts/expiry-times";
import RaceCreatedResultPositionsArchivePublisher from "../publishers/raceCreatedResultPositionsArchivePublisher";

export default class RaceCreatedSagaListener extends Listener<RaceCreatedSagaEvent> {
    queueGroupName = queueGroupName ;
    subject = SubjectRaceSage.raceCreatedSagaResult as const ;
    async onMessage(data: RaceCreatedSagaEvent['data'] , msg: Message): Promise<void> {
        try {
            // will have to do something with the client feedback here 
            const payload = data.payload ;

            const pipeline = redis.pipeline() ;
            pipeline.hset(`user:${payload.userData.user1}` , {
                status : userStatus.InRace
            }) ;
            pipeline.expire(`user:${payload.userData.user1}` , POSITION_DATA_EXPIRY_TIME) ;
            pipeline.hset(`user:${payload.userData.user2}` , {
                status : userStatus.InRace
            }) ;
            pipeline.expire(`user:${payload.userData.user2}` , POSITION_DATA_EXPIRY_TIME) ;

            await pipeline.exec() ;
            // events telling the saga that everything went well
            new RaceCreatedResultPositionsArchivePublisher(this.client).publish({
                raceId : data.payload.race.raceId ,
                sagaId : data.sagaId ,
                service : Services.archive ,
                status : true
            })
            msg.ack() ;
        } catch (err) {
            // event telling the saga that somethign went wrong
            new RaceCreatedResultPositionsArchivePublisher(this.client).publish({
                raceId : data.payload.race.raceId ,
                sagaId : data.sagaId ,
                service : Services.archive ,
                status : false
            })
            
        } finally {
            // acking the message in both cases
            msg.ack() ;
        }
    }
}