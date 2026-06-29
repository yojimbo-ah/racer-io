// this route will be used to create a new race and save in set in redis database
// so it can be treated by the set 
// the logique will be to check for the player then check if they are in radius close
// to each others and if the end location is not very far away 
// all of these will be treated  by this route then a event will be sent 
// race:started

import express , { Request , Response , NextFunction } from "express";
import { body } from "express-validator";
import {validateRequest ,  userStatus, RaceStatus} from "@racer-io/common";
import redis from "../redis";
import { inRegion } from "../func/inRegion";
import { UserData } from "../events/listeners/positionUpdatedListener";
import { RaceAwaitingPublisher } from "../events/publishers/raceAwaitingPublisher";
import { natsWrapper } from "../nats-wrapper";
import Race from "../models/race-model";

const MAXIMUM_LENGTH_BETWEEN_PLAYERS_TO_START_GAME = 2 //
const EXPIRY_TIME = 60 ; // the time period where the user being invited can accept the race or it get cancelled automaticlly

const router = express.Router() ;

router.post('/api/races/new' ,
    [
        body('friendId').isString() ,
        body('startPos').isObject() ,
        body('startPos.longitude').isFloat() ,
        body('startPos.latitude').isFloat() ,
        body('finishPos').isObject() ,
        body('finishPos.longitude').isFloat() ,
        body('finishPos.latitude').isFloat() ,
    ] ,
    validateRequest ,
    async (req : Request , res : Response , next : NextFunction) => {
        const {friendId} = req.body ;
        const startPos = {
            longitude : req.body.startPos.longitude ,
            latitude : req.body.srartPos.latitude
        }
        const endPosition = {
            longitude : req.body.finishPos.longitude ,
            latitude : req.body.finishPos.latitude
        }
        const result1String = await redis.get(req.currentUser!.id) ;
        const result2String = await redis.get(friendId) ;
        if (!result1String || !result2String) {
            throw new Error('Couldnt find needed user positions') ; 
        }
        const result1 = JSON.parse(result1String) as UserData ;
        const result2 = JSON.parse(result2String) as UserData ;

        // still didnt fix it but must add a check for if the user is already inside a race or not
        // need a fix in the redis database little and also the listeners and publishers events
        if (result1.userStatus !== userStatus.Idle || result2.userStatus !== userStatus.Idle) {
            throw new Error('Cant create the race one of the users is already in a race') ;
        }

        if (!inRegion(result1,startPos,MAXIMUM_LENGTH_BETWEEN_PLAYERS_TO_START_GAME) || !inRegion(result2,startPos,MAXIMUM_LENGTH_BETWEEN_PLAYERS_TO_START_GAME)) {
            throw new Error('players are not at the right start position')
        }
        const race = Race.build({
            user1 : req.currentUser!.id ,
            user2 : req.body.friendId ,
            startPos ,
            endingPos : endPosition
        })
        await race.save() ;

        // this event will be sent to the position event where it is hooked with the socket connection
        // so we can sent back a response to the frontend client of the friend user so he either accepts
        // or denied the race
        // then it will be handeled again by this service again
        await redis.set(`race:await:${race._id.toString()}` , JSON.stringify({
            user1 : req.currentUser!.id ,
            user2 : req.body.friendId
        }) , 'EX' , EXPIRY_TIME) ;

        new RaceAwaitingPublisher(natsWrapper.client).publish({
            userData : {
                user1 : req.currentUser!.id ,
                user2 : req.body.friendId
            } ,
            race : {
                startPos ,
                endPosition ,
                raceStatus : RaceStatus.RaceAwaiting ,
                raceId : race._id.toString()
            }
        })


        res.status(200).json({message : "race has been created in awaiting status waiting for other users confirmatiosn"}) ;
    }

)

export {router as newRouter} ;