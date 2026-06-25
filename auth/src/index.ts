import mongoose from "mongoose";
import app from "./app";


const connect = async () => {
    // making sure that the enviromental variables exist 
    // so we dont have a errror and so we can use the exclamation mark later
    // to tall typescypt to not force the type check
    // hello world  
    if (!process.env.JWT_KEY || !process.env.MONGO_URI) {
        throw new Error('JWT_KEY or MONGO_URI not diffined') ;
    }
    try {

        await mongoose.connect(process.env.MONGO_URI!) ;
        app.listen(3000 , () => {
            console.log("listening  on 3000") ;
        })
    } catch (error) {
        console.log(error)
    }
}
connect() ;
