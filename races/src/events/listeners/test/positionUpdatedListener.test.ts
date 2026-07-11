import { PositionUpdatedEvent, userStatus } from "@racer-io/common";
import { PositionUpdatedListener } from "../positionUpdatedListener";
import { PositionUpdatedAchivePublisher } from "../../publishers/positionUpdatedArchive";
import { natsWrapper } from "../../../nats-wrapper";
import mongoose from "mongoose";

// mocking nats-wrapper client
jest.mock('../../../nats-wrapper') ;

const setup = async () => {
    const positionUpdatedListener = new PositionUpdatedListener(natsWrapper.client) ;
    const userId = new mongoose.Types.ObjectId().toHexString() ;

    const event : PositionUpdatedEvent['data'] = {
        latitude : 15 ,
        longitude : 15 ,
        timestamp : Date.now().toString() ,
        userId : userId
    } ;

    //@ts-ignore
    const msg : Message = {
        ack : jest.fn()
    }

    return {
        event ,
        msg ,
        userId ,
        positionUpdatedListener
    }
}


it('acks the message sucusfflly' , async () => {
    const {event , msg , userId , positionUpdatedListener} = await setup() ;
    await positionUpdatedListener.onMessage(event , msg) ;
    expect(msg.ack).toHaveBeenCalled() ;

}) ;

it('publishes the event succussflly after updating the position' , async () => {
    const {userId , event , positionUpdatedListener , msg} = await setup() ;
    // creating a new user in redis
    // this one is just to make sure the listener works normally
    global.redisClient.hset(userId , {
        latitude : 10 ,
        longitude : 10 ,
        timestamp : Date.now().toString() ,
        userStatus : userStatus.Idle ,
        raceId : ''
    }) ;
    await positionUpdatedListener.onMessage(event , msg) ;
    const user = await redisClient.hgetall(userId) ;
    expect(user).toBeDefined() ;
    expect(user.longitude).toEqual('15') ;
    expect(user.latitude).toEqual('15') ;
    expect(user.userStatus).toEqual(userStatus.Idle) ;

    expect(natsWrapper.client.publish).toHaveBeenCalled() ;

    const publishedData = JSON.parse(
        //@ts-ignore
        natsWrapper.client.publish.mock.calls[0][1]
    )

}) ;

it('creates a new user position in the redis database' ,async () => {
    const {userId , event , positionUpdatedListener , msg} = await setup() ;
    await positionUpdatedListener.onMessage(event , msg) ;
    const userPos = await redisClient.hgetall(userId) ;
    expect(userPos).toBeDefined() ;
    expect(userPos.longitude).toEqual('15') ;
    expect(userPos.latitude).toEqual('15') ;
    expect(userPos.userStatus).toEqual(userStatus.Idle) ;    

}) ;