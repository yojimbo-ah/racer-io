import express , {Request , Response} from "express" ;
import { currentUser } from "@racer-io/common";


const router = express.Router() ;

router.get('/api/users/currentUser' ,
    currentUser ,
    (req : Request , res : Response) => {
        res.status(200).json({currentUser : req.currentUser || null}) ;
})

export {router as currentUserRouter} ;