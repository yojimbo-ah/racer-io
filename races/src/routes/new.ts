

// this route will be used to create a new race and save in set in redis database
// so it can be treated by the set 
// the logique will be to check for the player then check if they are in radius close
// to each others and if the end location is not very far away 
// all of these will be treated  by this route then a event will be sent 
// race:started

import express , { Request , Response , NextFunction } from "express";
import { body } from "express-validator";
import {validateRequest , PositionEventPayload} from "@racer-io/common";
import redis from "../redis";
import { inRegion } from "../func/inRegion";


const MAXIMUM_LENGTH_BETWEEN_PLAYERS_TO_START_GAME = 2 //

const router = express.Router() ;

router.post('/api/races/new' ,
    [
        body('friendId').isString() ,
        body('startPos').isObject() ,
        body('startPos.x').isFloat() ,
        body('startPos.y').isFloat() ,
        body('finishPos').isObject() ,
        body('finishPos.x').isFloat() ,
        body('finishPos.y').isFloat() ,
    ] ,
    validateRequest ,
    async (req : Request , res : Response , next : NextFunction) => {
        const {friendId} = req.body ;
        const startPos = {
            x : req.body.startPos.x ,
            y : req.body.srartPos.y
        }
        const result1String = await redis.get(req.currentUser!.id) ;
        const result2String = await redis.get(friendId) ;
        if (!result1String || !result2String) {
            throw new Error('Couldnt find needed user positions') ; 
        }
        const result1 = JSON.parse(result1String) as PositionEventPayload ;
        const result2 = JSON.parse(result2String) as PositionEventPayload ;

        // still didnt fix it but must add a check for if the user is already inside a race or not
        // need a fix in the redis database little and also the listeners and publishers events


        if (!inRegion(result1,startPos,MAXIMUM_LENGTH_BETWEEN_PLAYERS_TO_START_GAME) || !inRegion(result2,startPos,MAXIMUM_LENGTH_BETWEEN_PLAYERS_TO_START_GAME)) {
            throw new Error('players are not at the right start position')
        }
        // create a race request 

    }
)

export {router as newRouter} ;