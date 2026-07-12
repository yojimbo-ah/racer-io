import { PositionUpdatedAchiveListener } from "../positionUpdatedArchiveListener";
import { PositionUpdatedArchiveEvent } from "@racer-io/common";
import Position from "../../../models/positions-model";
import mongoose from "mongoose";
import { natsWrapper } from "../../../nats-wrapper";

jest.mock('../../../nats-wrapper') ;

const setup = async () => {
    const positionUpdatedArchiveListener = new PositionUpdatedAchiveListener(natsWrapper.client) ;
    const raceId = new mongoose.Types.ObjectId().toHexString() ;
    const event : PositionUpdatedArchiveEvent['data'] = {
        latitude : 10 ,
        longitude : 10 ,
        raceId : raceId ,
        timestamp : Date.now().toString() ,
        userId : 'user-id'
    } ;

    //@ts-ignore
    const msg : Message = {
        ack : jest.fn()
    }
    return {
        event ,
        msg ,
        positionUpdatedArchiveListener ,
        raceId
    }
}

it('acks the message succufully' , async () => {
    const {event , msg , positionUpdatedArchiveListener} = await setup() ;
    await positionUpdatedArchiveListener.onMessage(event , msg) ;
    expect(msg.ack).toHaveBeenCalled();
}) ;

it('creates the position record' , async () => {
    const {event , msg , positionUpdatedArchiveListener , raceId} = await setup() ;
    await positionUpdatedArchiveListener.onMessage(event , msg) ;
    const position = await Position.findOne({raceId : raceId}) ;
    expect(position).toBeDefined() ;
    expect(position!.longitude).toEqual(10) ;
    expect(position!.latitude).toEqual(10) ;
    expect(position!.userId).toEqual('user-id') ;
}) ;

