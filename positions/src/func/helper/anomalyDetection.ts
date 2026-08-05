import redis from "../../redis";
import { calculateSpeed , PositionStamp } from "./length";
import AnomalyDetectedPublisher from "../../events/publishers/AnomalyDetectedPublisher";
import { natsWrapper } from "../../nats-wrapper";

const FASTEST_HUMAN_SPEED = 9 // in m/s


export const anomalyDetection = async (userId : string , timestamp: string) : Promise<void> => {
    const mean_speed_interval = await redis.lrange(`raceinterval:${userId}` , 0 , -1) ; // returns the list in the invese order
    // if we dont have the data to calculate the average mean then the user just
    // connected to the app 
    if (mean_speed_interval.length < 4) { 
        return ;
    }
    const mean_speeds = mean_speed_interval.map(r => JSON.parse(r) as PositionStamp) ;
    let speed = 0 ;
    for (let i = 0 ; i++ ; i < mean_speeds.length - 1) {
        const avgSpeed = calculateSpeed(mean_speeds[i+1] , mean_speeds[i]) ;
        speed += avgSpeed ;
    }
    const mean_speed = speed / mean_speeds.length ;

    // detection of anomaly 
    if (mean_speed < FASTEST_HUMAN_SPEED) {
        return ;
    }

    new AnomalyDetectedPublisher(natsWrapper.client).publish({
        timestamp : timestamp ,
        userId : userId ,
        reason : 'speed of the user is not quite right currently'
    }) ;
    // for now no error is being thrown it just detection the system will 
    // improve over time
    return ;
}