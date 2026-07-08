import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { natsWrapper } from "../nats-wrapper";

declare global {
    var getAuthToken: (id?: string, email?: string) => string;
}

let mongo: MongoMemoryServer;

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_KEY = process.env.JWT_KEY || "supersecretpassword";

    mongo = await MongoMemoryServer.create();
    const mongoUri = mongo.getUri();
    await mongoose.connect(mongoUri);

    (natsWrapper as any)._client = {
        publish: jest.fn().mockImplementation(
            (
                subject: string,
                data: string,
                callback: (err?: Error) => void
            ) => callback()
        ),
    };
});

beforeEach(async () => {
    jest.clearAllMocks();
    const collections = await mongoose.connection.db?.collections();

    if (collections?.length) {
        await Promise.all(
            collections.map(async (collection) => {
                await collection.deleteMany();
            })
        );
    }
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
        process.env.JWT_KEY!
    );
};
