// this cancel is only in case of failure of race in one of the other services like the
// positions service
import { Listener , RaceCancelledPositionsEvent , SubjectRaceSage , userStatus} from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import redis from "../../redis";
import { POSITION_DATA_EXPIRY_TIME } from "../../../consts/expiry-times";

export default class RaceCancelledPositionsListener extends Listener<RaceCancelledPositionsEvent>{
    queueGroupName = queueGroupName ;
    subject = SubjectRaceSage.raceCancelledPositions as const ;
    async onMessage(data: RaceCancelledPositionsEvent['data'], msg: Message): Promise<void> {
        // still dont know how to cancell the logique will fix it later
        // in case of failure in other service we will reset the users status
        // in need of both uses ids so we can return the redis databse and 
        // maybe send event to the socket service also
            // will have to do something with the client feedback here 

            const pipeline = redis.pipeline() ;
            pipeline.hset(`user:${data.users.user1}` , {
                status : userStatus.Idle
            }) ;
            pipeline.expire(`user:${data.users.user1}` , POSITION_DATA_EXPIRY_TIME) ;
            pipeline.hset(`user:${data.users.user2}` , {
                status : userStatus.Idle
            }) ;
            pipeline.expire(`user:${data.users.user2}` , POSITION_DATA_EXPIRY_TIME) ;

            await pipeline.exec() ;

            msg.ack() ;
    }
}