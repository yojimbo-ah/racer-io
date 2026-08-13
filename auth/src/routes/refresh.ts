import express , {Request , Response} from "express" ;
import { requireAccessAuth , currentRefreshToken , UserPayload } from "@racer-io/common";
import User from "../models/user-model";
import jwt from 'jsonwebtoken' ;
import { Expiration } from "../consts/jwt-access-time";
const router = express.Router() ;


router.get('/api/refresh' , 
    currentRefreshToken ,
    requireAccessAuth ,
    async (req : Request, res : Response) => {
        const refreshUser = req.refreshUser ;
        const user = await User.findById(refreshUser!.id) ;
        if (!user) {
            throw new Error('Coulndt find the right user data') ;
        }

        const userPayload : UserPayload = {
            email : user.email ,
            id : user.id ,
            underSupervision : user.under_supervision ,
            reasonSupervision : user.reason_supervision 
        }

        // create the access token using the JWT_KEY secret
        const jwtToken = jwt.sign(userPayload , process.env.ACCESS_JWT_KEY! , {expiresIn : Expiration.access}) ;
        res.status(200).json({token : jwtToken}) ;

}) ;


export {router as refershRouter} ;
