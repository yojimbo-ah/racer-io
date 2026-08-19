import express from "express" ;
import 'express-async-errors';
import {NotFoundError , errorHandler , currentUser , requireAuth , underSupervision} from "@racer-io/common"


const TIME_BETWEEN_RACES_CHECKS = 20000 // 20S


const app = express() ;

app.set('trust proxy' , true) ;
app.use(express.json()) ;




app.all('*' , async () => {
    throw new NotFoundError() ;
})
app.use(errorHandler) ; 

export  {app} ;