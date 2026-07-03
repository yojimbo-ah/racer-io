// get the races the user has already been inside 

import express  , {Request , Response , NextFunction} from "express" ; 
import Race from "../models/race-model";

const router = express.Router() ;

router.get('/api/races' , async (req : Request , res : Response , next : NextFunction) => {
    const userId = req.currentUser!.id ;
    try {
        const races = await Race.find({
            users : userId
        })

        res.status(200).json({races}) ;
    } catch (err) {
        console.log(err) ;
        res.status(400).json({message : "error hppened"}) ;
    }

})

export {router as getRacesRouter} ;