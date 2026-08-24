import exress , {Request , Response , NextFunction} from 'express'
import { currentRefreshToken } from '@racer-io/common';
import Session from '../models/session';
import { ExpirationCookies } from '../consts/jwt-access-time';

const router = exress.Router() ;

router.post('/api/auth/logout' , 
    currentRefreshToken ,
    async (req : Request , res : Response , next : NextFunction) : Promise<void> => {
    await Session.findByIdAndDelete(req.refreshUser!.sessionId) ;
    res.clearCookie(ExpirationCookies.refreshTken ,{
        httpOnly : true
    })
    res.clearCookie(ExpirationCookies.accessToken , {
        httpOnly : true
    }) ;

    res.status(200).json({message : 'logout had been successful'}) ;
})

export {router as logoutRouter} ;