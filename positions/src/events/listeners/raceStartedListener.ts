import { Listener ,  RaceStartedEvent , RaceStatus, Subjects , userStatus} from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import redis from "../../redis";
import { POSITION_DATA_EXPIRY_TIME } from "../../../consts/expiry-times";


export class RaceStartedListener extends Listener<RaceStartedEvent> {
    subject = Subjects.RaceStarted as const ;
    queueGroupName = queueGroupName ;
    async onMessage(data: RaceStartedEvent['data'] , msg: Message): Promise<void> {
        // will have to do something with the client feedback here 
        const pipeline = redis.pipeline() ;
        pipeline.hset(`user:${data.userData.user1}` , {
            status : userStatus.InRace
        }) ;
        pipeline.expire(`user:${data.userData.user1}` , POSITION_DATA_EXPIRY_TIME) ;
        pipeline.hset(`user:${data.userData.user2}` , {
            status : userStatus.InRace
        }) ;
        pipeline.expire(`user:${data.userData.user2}` , POSITION_DATA_EXPIRY_TIME) ;

        await pipeline.exec() ;

        msg.ack() ;
    }
}