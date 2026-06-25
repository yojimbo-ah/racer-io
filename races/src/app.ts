import express from "express" ;
import 'express-async-errors';
import {NotFoundError , errorHandler , currentUser , requireAuth} from "@racer-io/common"
import { newRouter } from "./routes/new";

const TIME_BETWEEN_RACES_CHECKS = 10000 // 10S


const app = express() ;

app.set('trust proxy' , true) ;
app.use(express.json()) ;
app.use(currentUser) ;
app.use(requireAuth) ;
app.use(newRouter) ;


// now we have to create a mechanisam that check for running races
// and check the two players is one of them close to either position
setInterval(async () => {

} , TIME_BETWEEN_RACES_CHECKS)

app.all('*' , async () => {
    throw new NotFoundError() ;
})
app.use(errorHandler) ; 

export  {app} ;