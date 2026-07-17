import express , {Request , Response} from "express" ;
import redis from "../redis";
import { natsWrapper } from "../nats-wrapper";

const router = express.Router() ;

router.get('/api/positions/readyz' , async (req : Request , res : Response) => {
    // checking if the services has accessed all the neccessary dabatases and natsWarpper client
    try {
        if (redis.status !== 'ready' || !natsWrapper.client) {
            res.sendStatus(503) ;
        } else {
            res.sendStatus(200) ;
        }
    } catch {
        res.sendStatus(503) ;
    }

})

export {router as readyzRouter} ;