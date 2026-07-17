import express , {Request , Response} from "express" ;
import mongoose from "mongoose";
import { natsWrapper } from "../nats-wrapper";

const router = express.Router() ;

router.get('/api/positions/readyz' , async (req : Request , res : Response) => {
    // checking if the services has accessed all the neccessary dabatases and natsWarpper client
    const mongoOK = mongoose.connection.readyState === 1 ;
    try {
        if ( !natsWrapper.client || !mongoOK) {
            res.sendStatus(503) ;
        } else {
            res.sendStatus(200) ;
        }
    } catch {
        res.sendStatus(503) ;
    }

})

export {router as readyzRouter} ;