import express , {Request , Response} from "express" ;
import { requireAccessAuth , currentAccessToken , UserPayload } from "@racer-io/common";
import User from "../models/user-model";
import jwt from 'jsonwebtoken' ;
import { Expiration } from "../consts/jwt-access-time";
const router = express.Router() ;


router.get('/api/refresh' , 
    currentAccessToken ,
    requireAccessAuth ,
    async (req : Request, res : Response) => {
        const accessUser = req.accessUser ;
        const user = await User.findById(accessUser!.id) ;
        if (!user) {
            throw new Error('Coulndt find the right user data') ;
        }

        const userPayload : UserPayload = {
            email : user.email ,
            id : user.id ,
            underSupervision : user.under_supervision ,
            reasonSupervision : user.reason_supervision 
        }

        // create the refresh token using the JWT_KEY secret
        const jwtToken = jwt.sign(userPayload , process.env.JWT_KEY! , {expiresIn : Expiration.refresh}) ;
        res.status(200).json({token : jwtToken}) ;

}) ;


export {router as refershRouter} ;
