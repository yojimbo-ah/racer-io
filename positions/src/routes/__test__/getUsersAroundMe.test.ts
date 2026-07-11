import request from "supertest";
import { userStatus } from "@racer-io/common";
import app from "../../app";

// moking all the nats-wrapper from the mocks folder 
jest.mock("../../nats-wrapper");


describe("GET /api/positions/aroundme", () => {
    it("returns 401 when user is not authenticated", async () => {
        await request(app).get("/api/positions/aroundme").send().expect(401);
    });

    it("returns only nearby idle users and excludes current user", async () => {
        // these users shouldnt be shown user-1 , user-3 and user-4
        const token = getAuthToken('user-1' , 'user1@gmail.com');
        await redisClient.geoadd('active:users' , 10 , 10 , 'user-1') ;
        await redisClient.geoadd('active:users' , 10 , 10 , 'user-2') ;
        await redisClient.geoadd('active:users' , 10 , 10 , 'user-3') ; 
        await redisClient.geoadd('active:users' , 20 , 20 , 'user-4') ;
        await redisClient.hset(`user:user-1` , {status : userStatus.Idle}) ;
        await redisClient.hset('user:user-2' , {status : userStatus.Idle}) ;
        await redisClient.hset('user:user-3' , {status : userStatus.InRace}) ;
        await redisClient.hset('user:user-4' , {status : userStatus.Idle}) ;


        const response = await request(app)
            .get("/api/positions/aroundme")
            .set("Authorization", `Bearer ${token}`)
            .send()
            .expect(200);
        console.log(response.body.users) ;
        expect(response.body.users).toEqual([ "user-2"]);
    });
    
});
