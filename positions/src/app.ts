import express from "express" ;
import 'express-async-errors';
import { errorHandler , NotFoundError , requireAuth , currentUser} from "@racer-io/common" ;
import redis from "./redis";
import { getUsersAroundMe } from "./routes/getUsersAroundMe";
import { readyzRouter } from "./routes/readyz";
import { healthzRouter } from "./routes/healthz";

const app = express() ;

app.set('trust proxy' , true) ;
app.use(express.json()) ;
app.use(currentUser) ;
app.use(requireAuth) ;
app.use(getUsersAroundMe) ;
app.use(readyzRouter) ;
app.use(healthzRouter) ;


app.all('*' , async () => {
    throw new NotFoundError() ;
})
app.use(errorHandler) ; 
export default app ;