import express , {Request , Response} from "express" ;
import { body } from "express-validator";
import { validateRequest , BadRequestError , UserPayload , AccessPayload} from "@racer-io/common";
import jwt from "jsonwebtoken" ;
import { Password } from "../services/password";
import User from "../models/user-model";
import { Expiration } from "../consts/jwt-access-time";
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
        const accessPayload : AccessPayload = {
            email : user.email ,
            id : user.id
        }
        const userPayload : UserPayload = {
            email : user.email ,
            id : user.id ,
            underSupervision : user.under_supervision ,
            reasonSupervision : user.reason_supervision
        }
        const accessToken = jwt.sign(accessPayload, process.env.ACCESS_JWT_KEY! , {expiresIn : Expiration.access})
        const refreshToken = jwt.sign(userPayload, process.env.JWT_KEY! , {expiresIn : Expiration.refresh}) ;
        
        req.session = {
            jwt : refreshToken
        }

        res.status(201).json({user : user , token : refreshToken , accessToken}) ;
})

export {router as signInRouter} ;