import express , {Request , Response} from "express" ;
import { body } from "express-validator";
import { BadRequestError , validateRequest } from "@racer-io/common"
import { UserCreatedPublisher } from "../events/publishers/userCreatedPublisher";
import User  from "../models/user-model";
import jwt from "jsonwebtoken";
import { natsWrapper } from "../nats-wrapper";

const router = express.Router() ;

router.post('/api/users/signup' , 
    [
        body('email')
            .isEmail()
            .withMessage('invalid email') ,
        body('password')
            .trim()
            .isLength({min : 4 , max : 20})
            .withMessage("password must be between 4 and 20 characters") ,
        body('userName')
            .trim()
            .isLength({min : 4 , max : 30})
            .notEmpty()
            .withMessage('add your name')
    ] ,
    validateRequest
    , async (req : Request , res : Response) => {
        const {email , password , userName} = req.body ;

        const existingUser = await User.findOne({email : email}) ;
        if (existingUser) {
            throw new BadRequestError('email already in use' , 'email') ;
        }

        const user = User.build({email : email , password : password}) ;        
        await user.save() ;
        // exlamation mark means tells typescrips to not to worry about the 
        // type of JWT_KEY since we already vderified that is it existing and sicne it 
        // a string or undefined then it is a string
        const userJwt = jwt.sign({email : email , id : user._id}, process.env.JWT_KEY!)
        req.session = {
            jwt : userJwt
        }
        await new UserCreatedPublisher(natsWrapper.client).publish({
            email , userId : user._id.toString() , userName
        }) ;
        
        res.status(201).json({user : user , token : userJwt}) ;
})

export {router as signUpRouter} ;