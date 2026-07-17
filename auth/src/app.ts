import express from "express" ;
import 'express-async-errors';
import { currentUserRouter } from "./routes/current-user";
import { signInRouter } from "./routes/signin";
import { signUpRouter } from "./routes/singup";
import { healthzRouter } from "./routes/healthz";
import { readyzRouter } from "./routes/readyz";
import { errorHandler , NotFoundError } from "@racer-io/common" ;


const app = express() ;

app.set('trust proxy' , true) ;
app.use(express.json()) ;

app.use(currentUserRouter) ;
app.use(signInRouter) ;
app.use(signUpRouter) ;
app.use(healthzRouter) ;
app.use(readyzRouter) ;

app.all('*' , async () => {
    throw new NotFoundError() ;
})
app.use(errorHandler) ; 

export default app ;