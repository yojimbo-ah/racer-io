import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { PositionEventPayload, UserPayload } from '@racer-io/common';
import process = require('node:process');
import jwt from 'jsonwebtoken';
import { positionUpdatedSocket } from './func/socket/positionUpdated';
import UserConnectedPublisher from './events/publishers/UserConnectedPublisher';
import UserDisConnectedPublisher from './events/publishers/UserDisConnectedPublisher';
import { natsWrapper } from './nats-wrapper';


// maybe i will add a loop of here that runs every 20 seconds that checks for users in
// in your radius and sent them back to the client so he can create a new raec request

declare module "socket.io" {
  interface Socket {
    userId : string
  }
}

let io: Server | undefined;

export  const initSocket = (server : HttpServer) => {
  io = new Server(server, {
    // Socket.io listens at default /socket.io/ path
    cors: {
      origin:  '*'  ,
      methods: ['GET', 'POST' , 'PUT' , 'PATCH' , 'DELETE'] 
    },
    transports: ['websocket', 'polling']
  });

  // middlewares that checks for user authentification 
  io.use((socket , next) => {

    const token = socket.handshake.auth.token ;
    try {
      // the user must be logged in into the account 
      // has the refresh token (decrypt uisng JWT_KEY)
      const payload = jwt.verify(token , process.env.JWT_KEY!) as UserPayload ;
      // the user must not be under supervision 
      if (payload.underSupervision) {
        throw new Error('This user is under supervision') ;
      }
      socket.userId = payload.id ;
      next() ;
    } catch (err) {
      next(new Error('Couldnt valiate user'))
    }

  })
  io.on('connection', async (socket) => {
    console.log(`[socket] Client connected: ${socket.id}`);
    // tell other services the user has connected to the app
    // use userId the one coded in jwt not the socket id
    new UserConnectedPublisher(natsWrapper.client).publish({
      userId : socket.userId ,
      timestamp : new Date().toISOString()
    })

    // joining the users private room using the users is 
    socket.join(`user:${socket.userId}`) ;

    // still didnt fix the other listener in the races service or
    // maybe id create a new publisher named with socket
    // so it can be easily identified 
    socket.on('position:update' , async (payload : PositionEventPayload) => positionUpdatedSocket(payload , socket.userId)) ;

    socket.on('disconnect', async () => {
      
      // tell the other services tha tthe user has disconnected
      new UserDisConnectedPublisher(natsWrapper.client).publish({
        userId : socket.userId ,
        timestamp : new Date().toISOString()
      })
      console.log(`[socket] Client disconnected: ${socket.id}`) ;
    }) ;
  });


  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};
