import mongoose from "mongoose";
import app from "./app";
import { natsWrapper } from "./nats-wrapper";
import { CheaterDetectedListener } from "./events/listeners/cheaterDetectedListener";
import UserCreatedSagaResultListener from "./events/listeners/userCreationResultListener";
import blacklistRedis from "./blacklistRedis";
import { startOutboxRelay } from "./outbox/outboxRelay";
import { prepareMongo } from "./outbox/setMongoosePrimary";


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
    if (!process.env.MONGO_SRV) {
        throw new Error('MONGO SRV is not deffined') ;
    }

    await mongoose.connect(process.env.MONGO_URI!) ;
    // configure the databse so we can handle the watch and changes in it 
    // so we can detect when we should publish events
    await prepareMongo() ;
    console.log('connected to mongoose correctly') ;
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

    // created the rely to resend the events that had been set in the databse 
    // but didnt suscess to start the publisher
    
    await startOutboxRelay() ;
    app.listen(3000 , () => {
        console.log("listening  on 3000") ;
    })
}
connect() ;
