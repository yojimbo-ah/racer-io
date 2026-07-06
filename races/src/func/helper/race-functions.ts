import { UserData, UserDataString } from "../../events/listeners/positionUpdatedListener";
import redis from "../../redis"
import Race from "../../models/race-model";


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
    const raceString = await redis.get(`race:started:${raceId}`) ;
    if (raceString) {
        console.log('found the race') ;
        return JSON.parse(raceString) as RaceRedis ;
    }

    const raceRecord = await Race.findById(raceId) ;
    if (!raceRecord) {
        console.log('didnt find the race');
        throw new Error ('error happened')
    }

    const race = {
        user1 : raceRecord.users[0],
        user2 : raceRecord.users[1],
        startingPos : raceRecord.startPos,
        endingPos : raceRecord.endingPos,
    }

    await redis.set(`race:started:${raceId}`, JSON.stringify(race), 'EX', 3600) ;

    return race ;
}

export const getUserPosition = async (userId : string) : Promise<UserData> => {
    const userString = await redis.hgetall(userId)  as UserDataString ;
    if (!userString) {
        throw new Error ('Couldnt find the right user position');
    }
    const user : UserData = {
        ...userString ,
        longitude : Number(userString.longitude) ,
        latitude : Number(userString.latitude)
    } ;
    return user ;
}
