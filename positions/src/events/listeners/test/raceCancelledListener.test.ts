import { RaceCancelledEvent, RaceStatus, userStatus } from "@racer-io/common";
import { RaceCancelledListener } from "../raceCancelledListener";
import { natsWrapper } from "../../../nats-wrapper";
import { Message } from 'node-nats-streaming' ;

jest.mock("../../../socket.io");
jest.mock('../../../nats-wrapper') ;

const { mockIO } = jest.requireMock("../../../socket.io");

const setup = async () => {
    const raceCancelledListener = new RaceCancelledListener(natsWrapper.client) ;
    const event : RaceCancelledEvent['data'] = {
        race : {
            endPosition : {
                longitude : 10 ,
                latitude : 10
            } ,
            startPos : {
                longitude : 20 ,
                latitude : 20 
            } ,
            raceId : '12345' ,
            raceStatus : RaceStatus.RaceCancelled
        } ,
        userData : {
            user1 : 'user-1' ,
            user2 : 'user-2'
        }
    } ;

    //@ts-ignore
    const msg : Message = {
        ack : jest.fn()
    }

    return {
        raceCancelledListener ,
        event ,
        msg 
    }
} ;

it('acks the message succufully' , async () => {
    const {event , msg , raceCancelledListener} = await setup() ;
    await raceCancelledListener.onMessage(event , msg) ;
    expect(msg.ack).toHaveBeenCalled() ;

}) ;

it('to have called to and emit' , async () => {
    const {event , msg , raceCancelledListener} = await setup() ;
    await raceCancelledListener.onMessage(event , msg) ;
    expect(mockIO.to).toHaveBeenCalledWith('user:user-1') ;
    expect(mockIO.to).toHaveBeenCalledWith('user:user-2') ;
    expect(mockIO.emit).toHaveBeenCalledWith('race_cancelled' , event) ;
})

it('saves the status of both users as Idle' , async () => {
    const {raceCancelledListener , msg , event} = await setup() ;
    await raceCancelledListener.onMessage(event , msg) ;
    const status1 = await redisClient.hget('user:user-1' , 'status') ;
    const status2 = await redisClient.hget('user:user-2' , 'status') ;
    expect(status1).toEqual(userStatus.Idle) ;
    expect(status2).toEqual(userStatus.Idle) ;
})