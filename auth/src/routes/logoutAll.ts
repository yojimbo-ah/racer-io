import express , {Request , Response , NextFunction} from 'express'
import Session from '../models/session'
import { currentRefreshToken , requireAccessAuth } from '@racer-io/common';
import { ExpirationCookies } from '../consts/jwt-access-time';

const router = express.Router() ;
router.post('/api/auth/logoutall' , 
    currentRefreshToken ,
    requireAccessAuth ,
    async (req : Request , res : Response , next : NextFunction) => {
        // remove all the sessions related to the same user 
        await Session.deleteMany({
            userId : req.refreshUser!.id
        }) ;

        res.clearCookie(ExpirationCookies.accessToken , {
            httpOnly : true
        }) ;
        res.clearCookie(ExpirationCookies.refreshTken , {
            httpOnly : true
        }) ;

        res.status(200).json({message : 'all users had been logged out'}) ;
})




export  {router as logoutAllRouter}