import mongoose from "mongoose";
import app from "./app";
import { natsWrapper } from "./nats-wrapper";

const connect = async () => {
    // making sure that the enviromental variables exist 
    // so we dont have a errror and so we can use the exclamation mark later
    // to tall typescypt to not force the type check
    // hello world  
    if (!process.env.JWT_KEY || !process.env.MONGO_URI) {
        throw new Error('JWT_KEY or MONGO_URI not diffined') ;
    }
    if (!process.env.NATS_URL) {
        throw new Error('NATS connection url not dffined') ;
    }
    if (!process.env.NATS_CLUSTER_ID) {
        throw new Error('NATS cluster id not diffined') ;
    }
    if (!process.env.NATS_CLIENT_ID) {
        throw new Error('NATS client id not diffined') ;
    }
    try {

        await mongoose.connect(process.env.MONGO_URI!) ;
        await natsWrapper.connect(process.env.NATS_CLUSTER_ID , process.env.NATS_CLIENT_ID , {
            url : process.env.NATS_URL
        }) ;

        natsWrapper.client.on('close' , () => {
            console.log('NATS connection clossed') ;
            process.exit() ;
        })

        process.on('SIGINT' , () => natsWrapper.client.close()) ;
        process.on('SIGTERM' , () => natsWrapper.client.close()) ;
        app.listen(3000 , () => {
            console.log("listening  on 3000") ;
        })
    } catch (error) {
        console.log(error)
    }
}
connect() ;
