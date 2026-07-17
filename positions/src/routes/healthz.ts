import express , {Request , Response} from "express"

const router = express.Router() ;

router.get('/api/positions/healthz' , async (req : Request , res : Response) => {
    // checling the health of the app like there is no infinite loop happening
    res.sendStatus(200)
})

export {router as healthzRouter} ;