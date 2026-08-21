import app from "./app";
import process from "process";
import { natsWrapper } from "./nats-wrapper";
import http from "http"
import redis from "./redis";
import RaceCancelledPositionsListener from "./events/listeners/raceCancelledPositionsListener";
import RaceCreatedSagaListener from "./events/listeners/raceCreatedSagaListener";
import { RaceFinishedListener } from "./events/listeners/raceFinishedListener";
import { RaceCancelledListener } from "./events/listeners/raceCancelledListener";
import { PositionUpdatedSocketListener } from "./events/listeners/positionUpdatedSocketListener";
import { UserConnectedListener } from "./events/listeners/userConnectedListener";
import { UserDisConnectedListener } from "./events/listeners/userDisConnectedListener";

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
    if (!process.env.REDIS_HOST) {
        throw new Error('REDIS HOST not defined')
    }

    try {
        await natsWrapper.connect(process.env.NATS_CLUSTER_ID , process.env.NATS_CLIENT_ID , {
            url : process.env.NATS_URL ,
            connectTimeout : 5000
        }) ;

        natsWrapper.client.on('close' , () => {
            console.log('NATS connection clossed') ;
            process.exit() ;
        })
        await redis.connect() ;

        redis.on('connect' , () => {
            console.log('connecting to redis') ;
        })

        redis.on('close' , () => {
            console.log('closing connection to redis') ;
        })

        process.on('SIGINT' , () => natsWrapper.client.close()) ;
        process.on('SIGTERM' , () => natsWrapper.client.close()) ;

        new RaceFinishedListener(natsWrapper.client).listen() ;
        new RaceCancelledListener(natsWrapper.client).listen() ;
        new PositionUpdatedSocketListener(natsWrapper.client).listen() ;
        new UserConnectedListener(natsWrapper.client).listen() ;
        new UserDisConnectedListener(natsWrapper.client).listen() ;
        new RaceCancelledPositionsListener(natsWrapper.client).listen() ;
        new RaceCreatedSagaListener(natsWrapper.client).listen() ;

        const server = http.createServer(app) ;
        const port = Number(process.env.PORT) || 3000;

        server.listen(port , () => {
            console.log(`Positions service listening on ${port}`) ;
        }) ;
        
    } catch (error) {
        console.log(error)
    }
}
connect() ;
