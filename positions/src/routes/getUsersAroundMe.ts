// we need userStatus here also beceause i want to hide users who are in races when searching ,

import express , {Request , Response , NextFunction} from "express" ;
import redis from "../redis";
import { userStatus } from "@racer-io/common";

const RADIUS_OF_SEARCH = 5000 ;

const router = express.Router() ;

router.get('/api/positions/aroundme' ,
    async (req : Request , res : Response , next : NextFunction) => {
        const userId = req.currentUser!.id ;
        try {
            // redis will return the ids means the mmember will just return the,
            // currently later will duplicate user data her and send them

            // the setInterval will be set in the fronted currently so we reduce
            // the heavy lefting on the backend server
            const nearby = await redis.geosearch(
                'active:users',
                'FROMMEMBER', userId,
                'BYRADIUS', RADIUS_OF_SEARCH, 'km',
                'ASC' // sorted closest first
            ) as string [] ;
            
            // not cheking user status currently just sending it back but in the future
            // cheks will be added of course
            let users : string [] = [] 
            const promiseArray = nearby.map(async (user : string) => {
                const status = await redis.hget(`user:${user}` , 'status') ;
                // filter out the users who are not on idle status 
                // could be changed in the future such that 
                // the user could send a query param to seach by 
                if (status === userStatus.Idle) users.push(user) ;

            }) ;

            await Promise.all(promiseArray) ;
            res.status(200).json({users : users}) ;

        } catch (err) {
            console.log('error happaned') ;
            console.log(err) ;
            res.status(400).json({message : 'Error happaned couldnt fetch the suers'}) ;
        }
    }
)

export {router as getUsersAroundMe} ;