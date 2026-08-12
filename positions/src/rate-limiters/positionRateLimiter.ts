import { RateLimiterRedis } from "rate-limiter-flexible";
import redis from "../redis";



// keep position updates to roughly once every 10 seconds

export const positionRateLimiter = new RateLimiterRedis({
    storeClient : redis ,
    keyPrefix : 'position:update' ,
    points : 1 ,
    duration : 10
})