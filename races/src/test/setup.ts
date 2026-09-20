import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { RedisMemoryServer } from 'redis-memory-server';
import Redis from "ioredis";
import redis from "../redis";


declare global {
    var getAuthToken: (id?: string, email?: string) => string;
    var getAuthCookie: (id?: string, email?: string) => string;
    var redisClient : Redis ;
}

let mongo: MongoMemoryServer;
let redisServer : RedisMemoryServer ;

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_KEY = process.env.JWT_KEY || "supersecretpassword";
    process.env.ACCESS_JWT_KEY = process.env.ACCESS_JWT_KEY || "supersecretaccesspassword";

    // mongo stuff and urls
    mongo = await MongoMemoryServer.create();
    const mongoUri = mongo.getUri();

    // redis stuff and urls
    redisServer = new RedisMemoryServer();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    redis.options.host = host ;
    redis.options.port = port ;
    await redis.connect() ;
    await mongoose.connect(mongoUri);
    global.redisClient = redis ;

});

beforeEach(async () => {
    jest.clearAllMocks();
    const collections = await mongoose.connection.db?.collections();
    // flushing all the collections inside the mongodb database
    if (collections?.length) {
        await Promise.all(
            collections.map(async (collection) => {
                await collection.deleteMany();
            })
        );
    }
    // flushing all the data inside the redis database
    global.redisClient.flushall() ;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
}, 30000);

global.getAuthToken = (id = "test-user-id", email = "test@test.com") => {
    return jwt.sign(
        {
            id,
            email,
        },
        process.env.ACCESS_JWT_KEY!
    );
};

// the access token is delivered to the app via the accessToken cookie,
// so requests in the tests send it as a cookie rather than a Bearer header
global.getAuthCookie = (id = "test-user-id", email = "test@test.com") => {
    return `accessToken=${global.getAuthToken(id, email)}`;
};

