import express from "express" ;
import 'express-async-errors';
import {errorHandler , NotFoundError} from "@racer-io/common"
import { healthzRouter } from "./routes/healthz";
import { readyzRouter } from "./routes/readyz";

const app = express() ;

app.set('trust proxy' , true) ;
app.use(express.json()) ;
app.use(healthzRouter) ;
app.use(readyzRouter) ;


app.all('*' , async () => {
    throw new NotFoundError() ;
})
app.use(errorHandler) ; 

export default app ;