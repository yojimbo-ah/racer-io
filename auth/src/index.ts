import mongoose from "mongoose";
import app from "./app";
import { natsWrapper } from "./nats-wrapper";
import { CheaterDetectedListener } from "./events/listeners/cheaterDetectedListener";
import UserCreatedSagaResultListener from "./events/listeners/userCreationResultListener";
import blacklistRedis from "./blacklistRedis";

const connect = async () => {
    // making sure that the enviromental variables exist 
    // so we dont have a errror and so we can use the exclamation mark later
    // to tall typescypt to not force the type check
    // hello world  
    if (!process.env.JWT_KEY || !process.env.MONGO_URI) {
        throw new Error('JWT_KEY or MONGO_URI not diffined') ;
    }
    if (!process.env.ACCESS_JWT_KEY) {
        throw Error('ACESS_JWT_KEY is not defined') ;
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
    if (!process.env.REDIS_HOST_BLACKLIST) {
        throw new Error('REDIS HOST BLACKLIST is not defined') ;
    }

    try {

        await mongoose.connect(process.env.MONGO_URI!) ;
        await natsWrapper.connect(process.env.NATS_CLUSTER_ID , process.env.NATS_CLIENT_ID , {
            url : process.env.NATS_URL
        }) ;
        // connect to the redis client all the services will connect to this
        // database so we can check the blacklisted users with sharing state (single source of truth)
        await blacklistRedis.connect() ;
        natsWrapper.client.on('close' , () => {
            console.log('NATS connection clossed') ;
            process.exit() ;
        })

        process.on('SIGINT' , () => natsWrapper.client.close()) ;
        process.on('SIGTERM' , () => natsWrapper.client.close()) ;

        new CheaterDetectedListener(natsWrapper.client).listen() ;
        new UserCreatedSagaResultListener(natsWrapper.client).listen() ;

        app.listen(3000 , () => {
            console.log("listening  on 3000") ;
        })
    } catch (error) {
        console.log(error)
    }
}
connect() ;
