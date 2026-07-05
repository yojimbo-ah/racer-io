// get the races the user has already been inside 

import express  , {Request , Response , NextFunction} from "express" ; 
import Race from "../models/race-model";

const router = express.Router() ;

router.get('/api/races' , async (req : Request , res : Response , next : NextFunction) => {
    const userId = req.currentUser!.id ;
    const races = await Race.find({
        users : userId
    }).populate('users') ;

    res.status(200).json({races}) ;

})

export {router as getRacesRouter} ;