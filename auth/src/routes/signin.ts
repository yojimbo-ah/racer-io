import express , {Request , Response} from "express" ;
import { body } from "express-validator";
import { validateRequest , BadRequestError} from "@racer-io/common";
import jwt from "jsonwebtoken" ;
import { Password } from "../services/password";
import User from "../models/user-model";
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
        
        const userJwt = jwt.sign({email : email , id : user._id}, process.env.JWT_KEY!)
        req.session = {
            jwt : userJwt
        }
        res.status(201).json({user : user , token : userJwt}) ;
})

export {router as signInRouter} ;