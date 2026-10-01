import express , {Request , Response , NextFunction} from 'express'
import Session from '../models/session'
import { currentRefreshToken , requireAccessAuth } from '@racer-io/common';
import { ExpirationCookies , ACCESS_COOKIE_PATH , REFRESH_COOKIE_PATH } from '../consts/jwt-access-time';

const router = express.Router() ;
router.post('/api/auth/logoutall' , 
    currentRefreshToken ,
    requireAccessAuth ,
    async (req : Request , res : Response , next : NextFunction) => {
        // remove all the sessions related to the same user 
        await Session.deleteMany({
            userId : req.refreshUser!.id
        }) ;

        // the paths have to match the ones used when the cookies were set,
        // otherwise the browser keeps them
        res.clearCookie(ExpirationCookies.accessToken , {
            httpOnly : true ,
            path : ACCESS_COOKIE_PATH
        }) ;
        res.clearCookie(ExpirationCookies.refreshTken , {
            httpOnly : true ,
            path : REFRESH_COOKIE_PATH
        }) ;

        res.status(200).json({message : 'all users had been logged out'}) ;
})




export  {router as logoutAllRouter}