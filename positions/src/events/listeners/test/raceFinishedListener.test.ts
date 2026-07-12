import { RaceFinishedEvent, RaceStatus, userStatus } from "@racer-io/common";
import { RaceFinishedListener } from "../raceFinishedListener";
import { natsWrapper } from "../../../nats-wrapper";
import { Message } from 'node-nats-streaming' ;

jest.mock("../../../socket.io");
jest.mock('../../../nats-wrapper') ;

const { mockIO } = jest.requireMock("../../../socket.io");

const setup = async () => {
    const raceFinishedListener = new RaceFinishedListener(natsWrapper.client) ;
    const event : RaceFinishedEvent['data'] = {
        race : {
            endPosition : {
                latitude : 20 ,
                longitude : 20
            } ,
            startPos : {
                latitude : 10 ,
                longitude : 10
            } ,
            raceId : '12345' ,
            raceStatus : RaceStatus.RaceEnded
        } ,
        userData : {
            user1 : 'user-1' ,
            user2 : 'user-2' ,
            winner : 'user-1'
        }
    }

    //@ts-ignore
    const msg : Message = {
        ack : jest.fn()
    }
    return {
        raceFinishedListener ,
        event ,
        msg
    }
}

it('acks the message succufully' , async () => {
    const {msg , event , raceFinishedListener} = await setup() ;
    await raceFinishedListener.onMessage(event , msg) ;
    expect(msg.ack).toHaveBeenCalled() ;
}) ;

it('emits race finished to user_1 and user_2' , async () => {
    const {msg , event , raceFinishedListener} = await setup() ;
    await raceFinishedListener.onMessage(event , msg) ;

    expect(mockIO.to).toHaveBeenCalledWith("user:user-1");
    expect(mockIO.to).toHaveBeenCalledWith('user:user-2')
    expect(mockIO.emit).toHaveBeenNthCalledWith( 2 , "race_finished", event);
}) ;

it('saves the status of both users as idle' , async () => {
    const {msg , event , raceFinishedListener} = await setup() ;
    await raceFinishedListener.onMessage(event , msg) ;
    
    const status1 = await redisClient.hget('user:user-1' , 'status') ;
    const status2 = await redisClient.hget('user:user-2' , 'status') ;
    expect(status1).toEqual(userStatus.Idle) ;
    expect(status2).toEqual(userStatus.Idle) ;
})