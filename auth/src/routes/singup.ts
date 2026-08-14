import express , {Request , Response} from "express" ;
import { body } from "express-validator";
import { BadRequestError , validateRequest , UserPayload , RefreshPayload } from "@racer-io/common"
import { UserCreatedPublisher } from "../events/publishers/userCreatedPublisher";
import User  from "../models/user-model";
import jwt from "jsonwebtoken";
import { natsWrapper } from "../nats-wrapper";
import { Expiration } from "../consts/jwt-access-time";
import Session from "../models/session";

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
    , async (req : Request , res : Response) => {
        const {email , password , userName} = req.body ;

        const existingUser = await User.findOne({email : email}) ;
        if (existingUser) {
            throw new BadRequestError('email already in use' , 'email') ;
        }

        const user = User.build({email : email , password : password}) ;        
        await user.save() ;
        // exlamation mark means tells typescrips to not to worry about the 
        // type of JWT_KEY since we already vderified that is it existing and sicne it 
        // a string or undefined then it is a string

        await new UserCreatedPublisher(natsWrapper.client).publish({
            email , userId : user._id.toString() , userName
        }) ;
        // start with the sesion empty 
        // to get the session id
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
        req.session = {
            jwt : refreshToken
        }

        res.status(201).json({user : user , token : accessToken , accessToken : refreshToken}) ;
})

export {router as signUpRouter} ;