import exress , {Request , Response , NextFunction} from 'express'
import { currentRefreshToken } from '@racer-io/common';
import Session from '../models/session';
import { ExpirationCookies , ACCESS_COOKIE_PATH , REFRESH_COOKIE_PATH } from '../consts/jwt-access-time';

const router = exress.Router() ;

router.post('/api/auth/logout' , 
    currentRefreshToken ,
    async (req : Request , res : Response , next : NextFunction) : Promise<void> => {
    await Session.findByIdAndDelete(req.refreshUser!.sessionId) ;
    // the paths have to match the ones used when the cookies were set,
    // otherwise the browser keeps them
    res.clearCookie(ExpirationCookies.refreshTken ,{
        httpOnly : true ,
        path : REFRESH_COOKIE_PATH
    })
    res.clearCookie(ExpirationCookies.accessToken , {
        httpOnly : true ,
        path : ACCESS_COOKIE_PATH
    }) ;

    res.status(200).json({message : 'logout had been successful'}) ;
})

export {router as logoutRouter} ;