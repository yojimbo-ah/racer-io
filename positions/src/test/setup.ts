import jwt from "jsonwebtoken";
import redis from "../redis";
import Redis from "ioredis";
import { RedisMemoryServer } from 'redis-memory-server';

declare global {
    var getAuthToken: (id?: string, email?: string) => string;
    var redisClient : Redis ;
}

let redisServer : RedisMemoryServer ;

beforeAll( async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_KEY = process.env.JWT_KEY || "supersecretpassword";

    // redis stuff and urls
    redisServer = new RedisMemoryServer();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();

    redis.options.host = host ;
    redis.options.port = port ;

    await redis.connect() ;
    global.redisClient = redis ;
});

beforeEach(() => {
    jest.clearAllMocks();
    // removing all the data in the redis database
    global.redisClient.flushall() ;
});

global.getAuthToken = (id = "test-user-id", email = "test@test.com") => {
    return jwt.sign(
        {
            id,
            email,
        },
        process.env.JWT_KEY!
    );
};
