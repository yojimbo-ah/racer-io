import express from "express" ;
import cookieParser from 'cookie-parser' ;
import 'express-async-errors';
import {NotFoundError , errorHandler , currentUser , requireAuth , underSupervision} from "@racer-io/common"
import { newRouter } from "./routes/new";
import { acceptRaceRequestRouter } from "./routes/acceptRaceRequest";
import { getRacesRouter } from "./routes/getRaces";
import { healthzRouter } from "./routes/healthz";
import { readyzRouter } from "./routes/readyz";
import raceEngine from "./func/helper/race-engine";
import blacklistRedis from "./blacklistRedis";

const TIME_BETWEEN_RACES_CHECKS = 20000 // 20S


const app = express() ;

app.set('trust proxy' , true) ;
app.use(express.json()) ;
app.use(cookieParser()) ;
app.use(currentUser) ;
app.use(blacklistRedis.requireNotBlacklisted) ;
app.use(requireAuth) ;
app.use(underSupervision) ;
app.use(newRouter) ;
app.use(acceptRaceRequestRouter) ;
app.use(getRacesRouter) ;
app.use(readyzRouter) ;
app.use(healthzRouter) ;


// now we have to create a mechanisam that check for running races
// and check the two players is one of them close to either position

// this logique will be moved from the app.ts file 
// just for testing purposes and to make sure it will
// even work with this appraoch 

// this is a loop interval that runs every period
// check the status of every running race
let checking = false ;

if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
    setInterval(async () => {
        if (checking)  return ;
        try {
            checking = true ;
            // treats the users in active races
            raceEngine(checking) ;
        } finally {
            checking = false ;
        }

    } , TIME_BETWEEN_RACES_CHECKS) ;
}

app.all('*' , async () => {
    throw new NotFoundError() ;
})
app.use(errorHandler) ; 

export  {app} ;