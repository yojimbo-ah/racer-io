// we need userStatus here also beceause i want to hide users who are in races when searching ,

import express , {Request , Response , NextFunction} from "express" ;
import redis from "../redis";
import { userStatus } from "@racer-io/common";

const RADIUS_OF_SEARCH = 1 ;

const router = express.Router() ;

router.get('/api/positions/aroundme' ,
    async (req : Request , res : Response , next : NextFunction) => {
        const userId = req.currentUser!.id ;
        // first check if the user exists in the geoset
        console.log(userId) ;
        const exists = await redis.zscore('active:users' , userId) ;
        if (!exists) {
            res.status(200).json({users : []}) ;
            return ;
        }
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
        const members = await redis.zrange('active:users', 0, -1);
        console.log('all members in set:', members);
        console.log('nearby result:', nearby);
        // not cheking user status currently just sending it back but in the future
        // cheks will be added of course
        let users : string [] = [] 
        const promiseArray = nearby.map(async (user : string) => {
            const status = await redis.hget(`user:${user}` , 'status') ;
            const data = await redis.hgetall(`user:${user}`) ;
            console.log(data)
            // filter out the users who are not on idle status 
            // could be changed in the future such that 
            // the user could send a query param to seach by 
            if (status === userStatus.Idle && user !== userId) {
                users.push(user) ;
            }


        }) ;

        await Promise.all(promiseArray) ;
        res.status(200).json({users : users}) ;

    }
)

export {router as getUsersAroundMe} ;