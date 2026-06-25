import {MongoMemoryServer} from "mongodb-memory-server" ;
import app from "../app";
import mongoose from "mongoose";
import request from "supertest" ;

declare global {
    var getAuthToken: () => Promise<string>;  
}

let mongo : MongoMemoryServer

beforeAll(async () => {
    process.env.JWT_KEY = 'supersecretpassword' ;
    // creating a instance of mongo db storage in memory 
    // then connecting to it , before running any test , this
    // function runs before any code inside our testing side of
    // of code

    mongo = await MongoMemoryServer.create() ;
    const mongoUri = mongo.getUri() ;
    await mongoose.connect(mongoUri) ;
} , 1000000)


beforeEach(async () => {
    const collections = await mongoose.connection.db?.collections() ;
    // we might have a array of collections or undefiend so 
    // we typecheck and we loop on the colelctions we have and
    // we delete the collection
    if (collections?.length) {
        Promise.all(collections.map(async (collection) => {
            await collection.deleteMany() ;
        }))
    }
})

afterAll(async () => {
    // we have to stop the mongo db instance in the memory after
    // we are finished with the testing
    await mongo.stop() ; // stops the mongo db insctance
    await mongoose.connection.close() ; // ends the mongoose connection 
})

global.getAuthToken = async () => {
    const email = 'test@test.com' ;
    const password = 'password' ;

    const response = await request(app)
    .post('/api/users/signup')
    .send({
        email ,
        password
    })
    .expect(201) ;
    expect(response.get('Set-Cookie')).toBeDefined() ;
    return response.body.token ;
}