import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import type { PositionEventPayload , userStatus } from '@racer-io/common';
import process = require('node:process');
import PositionUpdatedPublisher from './events/publishers/PositionUpdatedPublisher';
import { natsWrapper } from './nats-wrapper';
import jwt from 'jsonwebtoken';
import redis from './redis';
import { speedX , speedY , speedTwoAxes } from './func/helper/length';

const TIME_BEFORE_DELETE = 60 ;


// maybe i will add a loop of here that runs every 20 seconds that checks for users in
// in your radius and sent them back to the client so he can create a new raec request

declare module "socket.io" {
  interface Socket {
    userId : string
  }
}
// will be sent to the comman library later
export type jwtPayload = {
  id : string 
  email : string
}


let io: Server | undefined;

export const initSocket = (server : HttpServer) => {
  io = new Server(server, {
    // Socket.io listens at default /socket.io/ path
    // The ingress routes both /socket.io/ and /api/positions/ to here
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
      const payload = jwt.verify(token , process.env.JWT_KEY!) as jwtPayload ;
    
      socket.userId = payload.id ;
      next() ;
    } catch (err) {
      next(new Error('Couldnt valiate user'))
    }

  })
  io.on('connection', async (socket) => {
    console.log(`[socket] Client connected: ${socket.id}`);

    // joining the users private room using the users is 
    socket.join(`user:${socket.userId}`) ;
    
    // Listen for position updates from clients
    socket.on('position:update', async (payload : PositionEventPayload) => {
      try {
        // will be used later so we can know users around the user who sent the request
        // plus the users who are currently online

        await redis.geoadd('active:users' , payload.x , payload.y , socket.userId) ; // saving the everything into geaspatial group

        new PositionUpdatedPublisher(natsWrapper.client).publish({
          longitude : payload.x ,
          latitude : payload.y ,
          timestamp : payload.timestamp ,
          userId : socket.userId ,
        }) ;
        
      } catch (err) {
          throw new Error('Error happened') ;
      }


    });

    socket.on('disconnect', () => {
      console.log(`[socket] Client disconnected: ${socket.id}`) ;
    }) ;
  });


  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};
