import express from "express" ;
import cookieParser from 'cookie-parser' ;
import 'express-async-errors';
import { errorHandler , NotFoundError , requireAuth , currentUser , underSupervision} from "@racer-io/common" ;
import { getUsersAroundMe } from "./routes/getUsersAroundMe";
import { readyzRouter } from "./routes/readyz";
import { healthzRouter } from "./routes/healthz";


// races is not hoked to a mongodb databse ,
// it used for edge computing and filtering and init the channels for
// other users and services and track the state of the user
// it doesnt own any type of data

const app = express() ;

app.set('trust proxy' , true) ;
app.use(express.json()) ;
app.use(cookieParser()) ;
app.use(currentUser) ;
app.use(requireAuth) ;
app.use(underSupervision) ;
app.use(getUsersAroundMe) ;
app.use(readyzRouter) ;
app.use(healthzRouter) ;


app.all('*' , async () => {
    throw new NotFoundError() ;
})
app.use(errorHandler) ; 
export default app ;