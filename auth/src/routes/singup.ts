import express , {Request , Response} from "express" ;
import { body } from "express-validator";
import { BadRequestError , validateRequest , UserPayload , RefreshPayload, userCreatedEvent, Subjects } from "@racer-io/common"
import User  from "../models/user-model";
import jwt from "jsonwebtoken";
import { Expiration , ExpirationCookies, ExpirationNum} from "../consts/jwt-access-time";
import Session from "../models/session";
import OutboxEvent from "../models/outbox-model";
import mongoose from "mongoose";
// used to send the tracing and save it inside the outbox model
// so it can be read and sent by the publisher later inside the relay 
// function
import { context, propagation } from "@opentelemetry/api";
// will use the refrech token method later 
// that to reduce query time specilly in race service
// since now am using a normal token login i cant rely on it to see if 
// the user is under supervision or not , 

// but with the double refresh token method it would make it easy to rely on it
// and also there is no query time also and the other services that doenst know 
// anything about the user model still rely on the token 

const router = express.Router() ;

router.post('/api/users/signup' , 
    [
        body('email')
            .isEmail()
            .withMessage('invalid email') ,
        body('password')
            .trim()
            .isLength({min : 4 , max : 20})
            .withMessage("password must be between 4 and 20 characters") ,
        body('userName')
            .trim()
            .isLength({min : 4 , max : 30})
            .notEmpty()
            .withMessage('add your name')
    ] ,
    validateRequest
    , async (req : Request , res : Response) : Promise<void> => {
        const {email , password , userName} = req.body ;

        const existingUser = await User.findOne({email : email}) ;
        if (existingUser) {
            throw new BadRequestError('email already in use' , 'email') ;
        }

        const user = User.build({email : email , password : password}) ;        
        // this session will make sure that either will success or not
        // if both success the publisher will be triggerd by the rely
        // automaticly
        const mongoSession = await mongoose.startSession();
        try {
            await mongoSession.withTransaction(async () => {
                await user.save({ session: mongoSession });

                const payload: userCreatedEvent['data'] = {
                    email: user.email,
                    userId: String(user._id),
                    userName: userName
                };
                // used to pass the carrier to the event that gonna publish
                // and it just saved by the outbox model only 
                const carrier: Record<string, string> = {};
                propagation.inject(context.active(), carrier);
                await OutboxEvent.build({
                    eventType: Subjects.userCreated,
                    payload ,
                    traceCarrier : carrier
                }).save({ session: mongoSession });
            });
        } finally {
            await mongoSession.endSession();
        }

        const session = Session.build({
            userId : String(user._id) ,
            hashSession : '' ,
            expiresAt : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ,
            ip : req.ip ,
            userAgent : req.headers['user-agent']
        })    
    
        const refreshPayload : RefreshPayload = {
            email : user.email ,
            id : user._id.toString() ,
            sessionId : String(session._id)
        }
        const userPayload : UserPayload = {
            email : user.email ,
            id : user._id.toString() ,
            underSupervision : user.under_supervision ,
            reasonSupervision : user.reason_supervision
        }
        const refreshToken = jwt.sign(refreshPayload , process.env.JWT_KEY! , {expiresIn : Expiration.refresh})
        const accessToken = jwt.sign(userPayload, process.env.ACCESS_JWT_KEY! , {expiresIn : Expiration.access}) ;
        // then add the hash token here
        session.hashSession = refreshToken ;

        await session.save() ;
        res.cookie(ExpirationCookies.accessToken , accessToken , {
            httpOnly: true,
            secure: true,        // HTTPS only
            sameSite: 'strict',  // or 'lax' if you need cross-site navigation to work  
            maxAge: ExpirationNum.access,
        }) ;
        res.cookie(ExpirationCookies.refreshTken , refreshToken , {
            httpOnly: true,
            secure: true,        // HTTPS only
            sameSite: 'strict',  // or 'lax' if you need cross-site navigation to work
            path: '/api/auth/refresh',
            maxAge: ExpirationNum.refresh, 
        })
        req.session = {
            jwt : refreshToken
        }

        res.status(201).json({user : user , token : accessToken , accessToken : refreshToken}) ;
})

export {router as signUpRouter} ;