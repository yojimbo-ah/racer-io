import { PositionEventPayload } from "@racer-io/common"
import PositionUpdatedSocketPublisher from "../../events/publishers/PositionUpdatedSocketPublisher"
import { natsWrapper } from "../../nats-wrapper"
import { positionRateLimiter } from "../../rate-limiters/positionRateLimiter"

export const positionUpdatedSocket = async (payload : PositionEventPayload , userId : string) : Promise<void> => {
    // socket channel cant be limited by the gateway nginx 
    // we use ratelimiter with redis setup to track data
    try {
        await positionRateLimiter.consume(userId) ;
    } catch (err) {
        console.log('reached the max updates per second') ;
        return ;
    }
    new PositionUpdatedSocketPublisher(natsWrapper.client).publish({
        longitude : payload.x ,
        latitude : payload.y ,
        timestamp : payload.timestamp ,
        userId : userId
    }) ;
}