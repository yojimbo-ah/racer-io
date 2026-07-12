import mongoose from "mongoose";
import { natsWrapper } from "../../../nats-wrapper";
import { RaceCancelledListener } from "../raceCancelledListener";
import { RaceCancelledEvent, RaceStatus } from "@racer-io/common";
import Race from "../../../models/race-model";

jest.mock('../../../nats-wrapper') ;

const setup = async () => {
    const raceCancelledListener = new RaceCancelledListener(natsWrapper.client) ;
    const raceId = new mongoose.Types.ObjectId().toHexString() ;
    const event : RaceCancelledEvent['data'] = {
        race : {
            endPosition : {
                longitude : 10 ,
                latitude : 10
            } ,
            raceId : raceId ,
            raceStatus : RaceStatus.RaceCancelled ,
            startPos : {
                longitude : 20 ,
                latitude : 20
            }
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
        raceCancelledListener ,
        raceId
    } ;
}

it('acks the message succuflly' , async () => {
    const {event , msg , raceCancelledListener} = await setup() ;
    await raceCancelledListener.onMessage(event , msg) ;
    expect(msg.ack).toHaveBeenCalled() ;
}) ;

it('save the the data succufully' , async () => {
    const {event , msg , raceCancelledListener , raceId} = await setup() ;
    await raceCancelledListener.onMessage(event , msg) ;
    const race = await Race.findById(raceId) ;
    expect(race).toBeDefined() ;
    expect(race!.raceStatus).toEqual(RaceStatus.RaceCancelled) ;
    // can check the other payload data
})

