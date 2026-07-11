import User from "../../../models/user-model";
import mongoose from "mongoose";
import { UserUpdatedListener } from "../userUpdatedListener";
import { userUpdatedEvent } from "@racer-io/common";
import { natsWrapper } from "../../../nats-wrapper";
import { Message } from "node-nats-streaming";

jest.mock('../../../nats-wrapper') ;
const setup = async () => {
    const userId = new mongoose.Types.ObjectId().toHexString() ;
    const user = User.build({
        email : 'test@test.com' ,
        userName : 'test' ,
        id : userId
    }) ;
    await user.save() ;

    const userUpdatedListener = new UserUpdatedListener(natsWrapper.client) ;
    const event : userUpdatedEvent['data'] = {
        email : 'testupdated@test.com' ,
        userName : 'testupdated' ,
        userId : userId
    } ;

    //@ts-ignore
    const msg : Message = {
        ack : jest.fn() 
    } ;
    return {
        msg ,
        event ,
        userUpdatedListener ,
        userId
    }
} ;


it('acks the message succefulyy' , async () => {
    const {msg , event , userUpdatedListener , userId} = await setup() ;
    await userUpdatedListener.onMessage(event , msg) ;
    expect(msg.ack).toHaveBeenCalled() ;
}) ;


it('creates a new user suffulyy' , async () => {
    const {msg , event , userUpdatedListener , userId} = await setup() ;
    await userUpdatedListener.onMessage(event , msg) ;
    const user = await User.findById(userId) ;
    expect(user).toBeDefined() ;
    expect(user!.userName).toEqual('testupdated') ;
}) ;

