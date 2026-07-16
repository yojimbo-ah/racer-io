import { RateLimiterRedis } from "rate-limiter-flexible";
import redis from "../redis";



// set the max update of the position to be twice per second 

export const positionRateLimiter = new RateLimiterRedis({
    storeClient : redis ,
    keyPrefix : 'position:update' ,
    points : 2 ,
    duration : 1
})