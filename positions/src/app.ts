import express from "express" ;
import 'express-async-errors';
import { errorHandler , NotFoundError , requireAuth , currentUser} from "@racer-io/common" ;

const app = express() ;

app.set('trust proxy' , true) ;
app.use(express.json()) ;
app.use(currentUser) ;
app.use(requireAuth) ;


app.all('*' , async () => {
    throw new NotFoundError() ;
})
app.use(errorHandler) ; 
export default app ;