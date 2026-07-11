import User from "../../../models/user-model";
import mongoose from "mongoose";
import { UserCreatedListener } from "../userCreatedListener";
import { userCreatedEvent } from "@racer-io/common";
import { natsWrapper } from "../../../nats-wrapper";
import { Message } from "node-nats-streaming";

jest.mock('../../../nats-wrapper') ;
const setup = async () => {
    const userCreatedListener = new UserCreatedListener(natsWrapper.client) ;
    const userId = new mongoose.Types.ObjectId().toHexString() ;
    const event : userCreatedEvent['data'] = {
        email : 'test@test.com' ,
        userName : 'test' ,
        userId : userId
    } ;

    //@ts-ignore
    const msg : Message = {
        ack : jest.fn() 
    } ;

    return {
        event ,
        msg ,
        userCreatedListener ,
        userId
    }
}

it('acks the message succefulyy' , async () => {
    const {event , msg , userCreatedListener} = await setup() ;
    await userCreatedListener.onMessage(event , msg) ;
    expect(msg.ack).toHaveBeenCalled() ;

}) ;


it('creates  user suffulyy' , async () => {
    const {event , msg , userCreatedListener , userId} = await setup() ;
    await userCreatedListener.onMessage(event , msg) ;
    const user = await User.findById(userId) ;
    expect(user).toBeDefined() ;
    expect(user!.email).toEqual('test@test.com') ;
    expect(user!.userName).toEqual('test') ;
}) ;


