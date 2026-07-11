import request from "supertest";
import { RaceStatus, userStatus } from "@racer-io/common";
import { app } from "../../app";
import redis from "../../redis";
import Race from "../../models/race-model";


// moking all the nats-wrapper from the mocks folder 
jest.mock("../../nats-wrapper")

// have to make them more detailed 
describe("POST /api/races/new", () => {
    it("returns 401 when user is not authenticated", async () => {
        await request(app)
            .post("/api/races/new")
            .send({})
            .expect(401);
    });

    it("returns 400 for invalid request payload (no ending pos and friendId)", async () => {
        const token = getAuthToken();
        await request(app)
            .post("/api/races/new")
            .set("Authorization", `Bearer ${token}`)
            .send({
                startPos: { longitude: 10, latitude: 10 },
            })
            .expect(400);
    });

    it('returns error 400 , no user in redis databse ' , async () => {
        const token1 = global.getAuthToken('user-1' , 'user1@gmail.com') ;
        const response1 = await request(app)
        .post('/api/races/new')
        .set('Authorization' , `Bearer ${token1}`)
        .send({
            friendId : 'user-2' ,
            startPos : {
                longitude : 10 ,
                latitude : 10
            } ,
            finishPos : {
                longitude : 20 ,
                latitude : 20
            }
        })
        expect(400) ;
    })


    it('returns error 400 , one of the users away from the starting position ' , async () => {
        const token1 = global.getAuthToken('user-1' , 'user1@gmail.com') ;
        await redis.hset('user-1' , {
            longitude : 10 ,
            latitude : 10 ,
            timestamp : Date.now().toString() ,
            raceId : '' ,
            userStatus : userStatus.Idle
        }) ;

        await redis.hset('user-2' , {
            longitude : 10 ,
            latitude : 20 ,
            timestamp : Date.now().toString() ,
            raceId : '' ,
            userStatus : userStatus.Idle
        }) ;

        const response1 = await request(app)
        .post('/api/races/new')
        .set('Authorization' , `Bearer ${token1}`)
        .send({
            friendId : 'user-2' ,
            startPos : {
                longitude : 10 ,
                latitude : 20
            } ,
            finishPos : {
                longitude : 12 ,
                latitude : 20
            }
        })
        .expect(400) ;
    })

    it("creates a race when payload is valid", async () => {
        const token1 = global.getAuthToken('user-1' , 'user1@gmail.com') ;
        await redis.hset('user-1' , {
            longitude : 10 ,
            latitude : 10 ,
            timestamp : Date.now().toString() ,
            raceId : '' ,
            userStatus : userStatus.Idle
        }) ;

        await redis.hset('user-2' , {
            longitude : 10 ,
            latitude : 10 ,
            timestamp : Date.now().toString() ,
            raceId : '' ,
            userStatus : userStatus.Idle
        }) ;

        const response1 = await request(app)
        .post('/api/races/new')
        .set('Authorization' , `Bearer ${token1}`)
        .send({
            friendId : 'user-2' ,
            startPos : {
                longitude : 10 ,
                latitude : 10
            } ,
            finishPos : {
                longitude : 12 ,
                latitude : 20
            }
        })
        .expect(200) ;
        expect(response1.body.raceId).toBeDefined() ;
        const raceId = response1.body.raceId ;
        const race = await Race.findById(raceId) ;
        expect(race).toBeDefined() ;
        expect(race!.raceStatus).toEqual(RaceStatus.RaceAwaiting) ;

        const raceRedis = await redis.get(`race:awaiting:${race!._id.toString()}`) ;
        expect(raceRedis).toBeDefined() ;
    }) ;

    it('error returns 400 , one of the users is not idle beceause he is in a race' , async () => {
        const token1 = global.getAuthToken('user-1' , 'user1@gmail.com') ;
        const token2 = global.getAuthToken('user-2' , 'user2@gmail.com') ;
        await redis.hset('user-1' , {
            longitude : 10 ,
            latitude : 10 ,
            timestamp : Date.now().toString() ,
            raceId : '' ,
            userStatus : userStatus.Idle
        }) ;

        await redis.hset('user-2' , {
            longitude : 10 ,
            latitude : 10 ,
            timestamp : Date.now().toString() ,
            raceId : '' ,
            userStatus : userStatus.Idle
        }) ;

        const response1 = await request(app)
        .post('/api/races/new')
        .set('Authorization' , `Bearer ${token1}`)
        .send({
            friendId : 'user-2' ,
            startPos : {
                longitude : 10 ,
                latitude : 10
            } ,
            finishPos : {
                longitude : 12 ,
                latitude : 20
            }
        })
        .expect(200) ;
        expect(response1.body.raceId).toBeDefined() ;
        const raceId = response1.body.raceId ;
        const reponse2 = await request(app)
        .post('/api/races/accept-race')
        .set('Authorization' , `Bearer ${token2}`)
        .send({
            accept : true ,
            raceId : raceId
        })
        .expect(200) ;
        

        const response3 = await request(app)
        .post('/api/races/new')
        .set('Authorization' , `Bearer ${token1}`)
        .send({
            friendId : 'user-2' ,
            startPos : {
                longitude : 10 ,
                latitude : 10
            } ,
            finishPos : {
                longitude : 20 ,
                latitude : 20
            }
        })
        .expect(400)
    }) ;
});
