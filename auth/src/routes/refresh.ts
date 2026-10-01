import express , {Request , Response} from "express" ;
import { requireAccessAuth , currentRefreshToken , UserPayload , NotAuthorizedError } from "@racer-io/common";
import User from "../models/user-model";
import jwt from 'jsonwebtoken' ;
import { Expiration , ExpirationNum , ExpirationCookies , ACCESS_COOKIE_PATH } from "../consts/jwt-access-time";
import Session from "../models/session";


const router = express.Router() ;


router.get('/api/refresh' , 
    currentRefreshToken ,
    requireAccessAuth ,
    async (req : Request, res : Response) => {
        // the middleware aleready checked the validyty of the
        // refresh token 
        const refreshUser = req.refreshUser ;
        const user = await User.findById(refreshUser!.id) ;
        if (!user) {
            throw new Error('Coulndt find the right user data') ;
        }


        // check the session validaty 
        const session = await Session.findById(refreshUser!.sessionId) ;
        if (!session) {
            throw new NotAuthorizedError('The session is not valid')
        } ;

        if (session.expiresAt < new Date()) {
            // if the dates passes the expiry time then the token is not 
            // valid anymore


            throw new NotAuthorizedError('your session has expired') ;
        }

        const userPayload : UserPayload = {
            email : user.email ,
            id : user.id ,
            underSupervision : user.under_supervision ,
            reasonSupervision : user.reason_supervision 
        }
        // create the access token using the JWT_KEY secret

        const jwtToken = jwt.sign(userPayload , process.env.ACCESS_JWT_KEY! , {expiresIn : Expiration.access}) ;
        res.cookie(ExpirationCookies.accessToken ,jwtToken , {
            httpOnly: true,
            secure: true,        // HTTPS only
            sameSite: 'strict',  // or 'lax' if you need cross-site navigation to work
            path : ACCESS_COOKIE_PATH ,
            maxAge: ExpirationNum.access ,
        })
        res.status(200).json({token : jwtToken}) ;

}) ;


export {router as refershRouter} ;
