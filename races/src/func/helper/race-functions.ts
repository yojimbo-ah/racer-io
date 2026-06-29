import { UserData } from "../../events/listeners/positionUpdatedListener";
import redis from "../../redis"
import { Position } from "@racer-io/common";

const RADIUS_TO_FINISH_POINT = 1 ;

export type RaceRedis = {
    user1 : string ;
    user2 : string ;
    startingPos : {
        longitude : number ,
        latitude : number
    } ,
    endingPos : {
        longitude : number ,
        latitude : number
    }
}

export const getRaces = async () : Promise<string[]>  => {
    const races = await redis.smembers('races:active') ;
    return races ;
}

export const getRace = async (raceId : string) : Promise<RaceRedis> => {
    const raceString = await redis.get(`race:started"${raceId}`) ;
    if (!raceString) {
        throw new Error ('error happened')
    }
    const race = JSON.parse(raceString) as RaceRedis ;
    return race ;
}

export const getUserPosition = async (userId : string) : Promise<UserData> => {
    const userString = await redis.get(userId) ;
    if (!userString) {
        throw new Error ('Couldnt find the right user position');
    }
    const user = JSON.parse(userString) as UserData ;
    return user ;
}

export const getUserLengthFromPos = (pos1 : Position , pos2 : Position ) : number => {
    return Math.pow((Math.pow(pos1.longitude - pos1.longitude , 2) + Math.pow(pos1.latitude - pos2.latitude,2)) , 0.5) ;
}