import { Listener , Subjects , RaceCancelledEvent, Position, RaceStatus, userStatus } from "@racer-io/common";
import { queueGroupName } from "../queueGroupName";
import { Message } from "node-nats-streaming";
import redis from "../../redis";
import { POSITION_DATA_EXPIRY_TIME } from "../../../consts/expiry-times";

export class RaceCancelledListener extends Listener<RaceCancelledEvent> {
    queueGroupName = queueGroupName ;
    subject = Subjects.RaceCancelled as const ;
    async onMessage(data: RaceCancelledEvent['data'], msg: Message): Promise<void> {
        const pipeline = redis.pipeline() ;
        
        pipeline.hset(`user:${data.userData.user1}` , {status : userStatus.Idle}) ;
        pipeline.expire(`user:${data.userData.user1}` , POSITION_DATA_EXPIRY_TIME) ;
        pipeline.hset(`user:${data.userData.user2}` , {status : userStatus.Idle}) ;
        pipeline.expire(`user:${data.userData.user2}` , POSITION_DATA_EXPIRY_TIME) ;

        await pipeline.exec() ;
        msg.ack() ;
    }
}