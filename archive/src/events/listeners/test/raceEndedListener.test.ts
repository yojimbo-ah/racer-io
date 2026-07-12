import mongoose from "mongoose";
import { natsWrapper } from "../../../nats-wrapper";
import { RaceFinishedEvent , RaceStatus } from "@racer-io/common";
import { RaceFinishedListener } from "../raceEndedListener";
import Race from "../../../models/race-model";

jest.mock('../../../nats-wrapper') ;

const setup = async () => {
    const raceFinishedListener = new RaceFinishedListener(natsWrapper.client) ;
    const raceId = new mongoose.Types.ObjectId().toHexString() ;
    const event : RaceFinishedEvent['data'] = {
        race : {
            endPosition : {
                longitude : 10 ,
                latitude : 10
            } ,
            raceId : raceId ,
            raceStatus : RaceStatus.RaceEnded ,
            startPos : {
                longitude : 20 ,
                latitude : 20
            }
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
        event ,
        msg ,
        raceFinishedListener ,
        raceId
    } ;
}

it('acks the message succuflly' , async () => {
    const {event , msg , raceFinishedListener} = await setup() ;
    await raceFinishedListener.onMessage(event , msg) ;
    expect(msg.ack).toHaveBeenCalled() ;
}) ;

it('save the the data succufully' , async () => {
    const {event , msg , raceFinishedListener , raceId} = await setup() ;
    await raceFinishedListener.onMessage(event , msg) ;
    const race = await Race.findById(raceId) ;
    expect(race).toBeDefined() ;
    expect(race!.raceStatus).toEqual(RaceStatus.RaceEnded) ;
    // in the this case the winner is user-1 look at the event data
    expect(race!.winner).toEqual('user-1') ;
    // can check the other payload data
})

