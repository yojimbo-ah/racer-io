import express from "express" ;
import 'express-async-errors';
import { errorHandler , NotFoundError , requireAuth , currentUser} from "@racer-io/common" ;
import redis from "./redis";

const TIME_BETWEEN_RACES_CHECKS = 20000 // 20S

const app = express() ;

app.set('trust proxy' , true) ;
app.use(express.json()) ;
app.use(currentUser) ;
app.use(requireAuth) ;


// will add a timeInteval here that treats active users each 20s 
// each time period check who is in the person radius and 
// returns it via the socket channel to the client browser (later mobile app) 
// using redis geospatial mode it to treat the logique and minimize time
// comlixity 
let checking = false ;

setInterval(async () => {
    // get all active users

    // treat individual user by getting all the users in his redius 
    // and return them via socket to users_around_me

    
} , TIME_BETWEEN_RACES_CHECKS) ;

app.all('*' , async () => {
    throw new NotFoundError() ;
})
app.use(errorHandler) ; 
export default app ;