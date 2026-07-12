import { RaceStartedEvent, RaceStatus, userStatus } from "@racer-io/common";
import { RaceStartedListener } from "../raceStartedListener";
import { natsWrapper } from "../../../nats-wrapper";
import { Message } from 'node-nats-streaming' ;
import redis from "../../../redis";

jest.mock('../../../nats-wrapper') ;
jest.mock("../../../socket.io");

const { mockIO } = jest.requireMock("../../../socket.io");

const setup = async () => {
    const raceStartedListener = new RaceStartedListener(natsWrapper.client) ;
    const event : RaceStartedEvent['data'] = {
        race : {
            startPos : {
                latitude : 10 ,
                longitude : 10
            } ,
            endPosition : {
                latitude : 20 ,
                longitude : 20
            } ,
            raceId : '12345' ,
            raceStatus : RaceStatus.RaceStared
        } ,
        userData : {
            user1 : 'user-1' ,
            user2 : 'user-2'
        }
    }

    //@ts-ignore
    const msg : Message = {
        ack : jest.fn()
    }
    return {
        event ,
        msg ,
        raceStartedListener
    }
} ;

it('emits race started to user_1' , async () => {
    const {event , msg, raceStartedListener} = await setup() ;
    await raceStartedListener.onMessage(event , msg) ;
    expect(mockIO.to).toHaveBeenCalledWith("user:user-1");
    expect(mockIO.emit).toHaveBeenCalledWith("race_started", event);
}) ;

it('acks the message' , async () => {
    const {event , msg , raceStartedListener} = await setup() ;
    await raceStartedListener.onMessage(event , msg) ;
    expect(msg.ack).toHaveBeenCalled() ;
}) ;

it('saves status of both users as inRace' , async () => {
    const {event , msg , raceStartedListener} = await setup() ;
    await raceStartedListener.onMessage(event , msg) ;
    const statu1 = await redisClient.hget('user:user-1' , 'status') ;
    const status2 = await redisClient.hget('user:user-2' , 'status') ;
    expect(statu1).toEqual(userStatus.InRace) ;
    expect(status2).toEqual(userStatus.InRace) ;
}) ;