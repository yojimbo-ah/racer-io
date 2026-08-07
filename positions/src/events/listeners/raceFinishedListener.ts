import { Listener , Subjects , RaceFinishedEvent , Position, RaceStatus, userStatus } from "@racer-io/common";
import { Message } from "node-nats-streaming";
import { queueGroupName } from "../queueGroupName";
import redis from "../../redis";
import { POSITION_DATA_EXPIRY_TIME } from "../../../consts/expiry-times";
export class RaceFinishedListener extends Listener<RaceFinishedEvent> {
    subject = Subjects.RaceFinished as const ;
    queueGroupName = queueGroupName; 
    async onMessage(data: RaceFinishedEvent['data'] , msg: Message): Promise<void> {
        const pipeline = redis.pipeline() ;

        pipeline.hset(`user:${data.userData.user1}` , {
            status : userStatus.Idle
        }) ;
        pipeline.expire(`user:${data.userData.user1}` , POSITION_DATA_EXPIRY_TIME) ;

        pipeline.hset(`user:${data.userData.user2}` , {
            status : userStatus.Idle
        }) ;
        pipeline.expire(`user:${data.userData.user2}` , POSITION_DATA_EXPIRY_TIME) ;
        await pipeline.exec() ;

        msg.ack() ;
    }
}