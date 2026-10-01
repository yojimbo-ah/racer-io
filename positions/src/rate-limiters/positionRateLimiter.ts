import { RateLimiterRedis } from "rate-limiter-flexible";
import redis from "../redis";



// keep position updates to roughly once every 10 seconds

export const positionRateLimiter = new RateLimiterRedis({
    storeClient : redis ,
    keyPrefix : 'position:update' ,
    points : 1 ,
    duration : 10
})

// load tests push position updates far above 1 per 10s per user, so the limiter
// is skipped entirely when POSITION_RATE_LIMIT_DISABLED=true -- that is what the
// manifests under infra/base set, the manifests under infra/k8s do not
export const isPositionRateLimitDisabled : boolean =
    process.env.POSITION_RATE_LIMIT_DISABLED === "true" ;

// resolves to true when the update is allowed through, false when it was throttled
export const consumePositionUpdate = async (key : string) : Promise<boolean> => {
    if (isPositionRateLimitDisabled) {
        return true ;
    }
    try {
        await positionRateLimiter.consume(key) ;
        return true ;
    } catch {
        return false ;
    }
}