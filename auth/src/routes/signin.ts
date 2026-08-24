import express , {Request , Response} from "express" ;
import { body } from "express-validator";
import { validateRequest , BadRequestError , UserPayload , RefreshPayload} from "@racer-io/common";
import jwt from "jsonwebtoken" ;
import { Password } from "../services/password";
import User from "../models/user-model";
import { Expiration , ExpirationNum , ExpirationCookies} from "../consts/jwt-access-time";
import Session from "../models/session";


const router = express.Router() ;

router.post('/api/users/signin' , 
    [
        body('email')
            .isEmail()
            .withMessage('invalid email') ,
        body('password')
            .trim()
            .notEmpty()
            .withMessage("You must add a passowrd") ,
    ] ,
    validateRequest
    , async (req : Request , res : Response) => {
        const {email , password} = req.body ;
        const user = await User.findOne({email : email}) ;
        if (!user) {
            throw new BadRequestError('Invalid user data') ;
        }
        const passwordCompare = await Password.toCompare(user.password , password) ;
        if (!passwordCompare) {
            throw new BadRequestError('Invalid user password') ;
        }
        const session = Session.build({
            userId : String(user._id) ,
            hashSession : '' ,
            expiresAt : new Date(Date.now() + ExpirationNum.refresh) ,
            ip : req.ip ,
            userAgent : req.headers['user-agent']
        })

        const refreshPayload : RefreshPayload = {
            email : user.email ,
            id : user.id ,
            sessionId : String(session._id)
        }
        const userPayload : UserPayload = {
            email : user.email ,
            id : user.id ,
            underSupervision : user.under_supervision ,
            reasonSupervision : user.reason_supervision
        } ;

        const refreshToken = jwt.sign(refreshPayload , process.env.JWT_KEY! , {expiresIn : Expiration.refresh})
        const accessToken = jwt.sign(userPayload, process.env.ACCESS_JWT_KEY! , {expiresIn : Expiration.access}) ;
        
        // save the session in the SessionModel 
        session.hashSession = refreshToken ;

        await session.save() ;

        req.session = {
            jwt : refreshToken
        }
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
        res.status(201).json({user : user , token : accessToken , accessToken : refreshToken}) ;
})

export {router as signInRouter} ;