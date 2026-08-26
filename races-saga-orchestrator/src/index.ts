import {app} from "./app";
import { natsWrapper } from "./nats-wrapper";
import mongoose from "mongoose";
import RaceCreatedResultPositionsListener from "./events/race-created/listeners/raceCreatedResultPositions";
import RaceCreatedSagaListener from "./events/race-created/listeners/raceCreatedSagaListener";
import UserCreatedResultRacesArchiveListener from "./events/user-created/listeners/userCreatedResultArchiveRacesListener";
import UserCreatedSagaListener from "./events/user-created/listeners/userCreatedSagaListener";
import { prepareMongo } from "./outbox/setMongoosePrimary";

const connect = async () => {
    // making sure that the enviromental variables exist 
    // so we dont have a errror and so we can use the exclamation mark later
    // to tall typescypt to not force the type check
    if (!process.env.JWT_KEY) {
        throw new Error('JWT_KEY  not diffined') ;
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
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO URI not diffined') ;
    }
    try {

        await natsWrapper.connect(process.env.NATS_CLUSTER_ID , process.env.NATS_CLIENT_ID , {
            url : process.env.NATS_URL
        }) ;

        natsWrapper.client.on('close' , () => {
            console.log('NATS connection clossed') ;
            process.exit() ;
        })

        process.on('SIGINT' , () => natsWrapper.client.close()) ;
        process.on('SIGTERM' , () => natsWrapper.client.close()) ;


        // all the listeners that the service currently uses 

        // race started orchestrators
        new RaceCreatedResultPositionsListener(natsWrapper.client).listen() ;
        new RaceCreatedSagaListener(natsWrapper.client).listen() ;

        // user created orchestrators
        new UserCreatedSagaListener(natsWrapper.client).listen() ;
        new UserCreatedResultRacesArchiveListener(natsWrapper.client).listen() ;
        // listen to mongo to connect before we configure it 
        await mongoose.connect(process.env.MONGO_URI) ;
        await prepareMongo()
        app.listen(3000 , () => {
            console.log("listening  on 3000") ;
        })

    } catch (error) {
        console.log(error)
    }
}
connect() ;
