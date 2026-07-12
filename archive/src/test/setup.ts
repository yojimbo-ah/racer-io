import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";



declare global {
    var getAuthToken: (id?: string, email?: string) => string;
}
let mongo : MongoMemoryServer ;


beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_KEY = process.env.JWT_KEY || "supersecretpassword";

    // mongo stuff and urls
    mongo = await MongoMemoryServer.create();
    const mongoUri = mongo.getUri();

    // redis stuff and urls

    await mongoose.connect(mongoUri);
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

