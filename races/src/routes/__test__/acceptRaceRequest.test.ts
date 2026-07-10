import request from "supertest";
import { app } from "../../app";
import Race from "../../models/race-model";
import { RaceStatus, userStatus } from "@racer-io/common";


// moking all the nats-wrapper from the mocks folder 
jest.mock("../../nats-wrapper");


// still modifying the tests working on it // 


it("returns 401 when user is not authenticated", async () => {
    await request(app)
        .post("/api/races/accept-race")
        .send({})
        .expect(401);
});

it("returns 400 for invalid payload", async () => {
    const token = getAuthToken("user-2");

    await request(app)
        .post("/api/races/accept-race")
        .set("Authorization", `Bearer ${token}`)
        .send({ raceId: 123, accept: "yes" })
        .expect(400);
});

it("accepts race request and starts race", async () => {
    // saves both users postions in redis database 
    // create a new rece from the new route
    // accept the race

    await global.redisClient.hset('user-1' , {
        longitude : 1 ,
        latitude : 1 ,
        timestamp : Date.now().toString() ,
        userStatus : userStatus.Idle ,
        raceId : ''
    }) ;
    await global.redisClient.hset('user-2' , {
        longitude : 1 ,
        latitude : 1 ,
        timestamp : Date.now().toString() ,
        userStatus : userStatus.Idle ,
        raceId : ''
    }) ;


    const token1 = global.getAuthToken('user-1' , 'test1@gmail.com');
    const token2 = global.getAuthToken('user-2' , 'test2@gmail.com') ;

    const response1 = await request(app).post('/api/races/new')
    .set('Authorization' , `Bearer ${token1}`)
    .send({
        friendId : 'user-2' ,
        startPos : {
            longitude : 1 ,
            latitude : 1
        } ,
        finishPos : {
            longitude : 11 ,
            latitude : 12
        }
    })
    .expect(200) ;

    const raceId = response1.body.raceId ;

    const race1 = await Race.findById(raceId) ;
    expect(race1).toBeDefined() ;
    expect(race1!.raceStatus).toEqual(RaceStatus.RaceAwaiting) ;
    expect(race1!.users[0]).toEqual('user-1') ;
    expect(race1!.users[1]).toEqual('user-2') ;

    const raceDataString = await global.redisClient.get(`race:await:${raceId}`);
    expect(raceDataString).toBeDefined() ;
    const raceData = JSON.parse(raceDataString!) ;
    expect(raceData.user1).toBe('user-1');
    expect(raceData.user2).toBe('user-2');

    // accepting the race from the other user side
    const response = await request(app)
        .post("/api/races/accept-race")
        .set("Authorization", `Bearer ${token2}`)
        .send({ raceId: raceId , accept: true })
        .expect(200);

    expect(response.body.accepted).toBe(true);
    expect(await global.redisClient.sismember('races:active' , raceId)).toBeTruthy() ;

    const race2 = await Race.findById(raceId) ;
    expect(race2).toBeDefined() ;
    expect(race2!.raceStatus).toEqual(RaceStatus.RaceStared) ;
});

it("cancels race request when accept is false", async () => {
    await global.redisClient.hset('user-1' , {
        longitude : 1 ,
        latitude : 1 ,
        timestamp : Date.now().toString() ,
        userStatus : userStatus.Idle ,
        raceId : ''
    }) ;
    await global.redisClient.hset('user-2' , {
        longitude : 1 ,
        latitude : 1 ,
        timestamp : Date.now().toString() ,
        userStatus : userStatus.Idle ,
        raceId : ''
    }) ;


    const token1 = global.getAuthToken('user-1' , 'test1@gmail.com');
    const token2 = global.getAuthToken('user-2' , 'test2@gmail.com') ;

    const response1 = await request(app).post('/api/races/new')
    .set('Authorization' , `Bearer ${token1}`)
    .send({
        friendId : 'user-2' ,
        startPos : {
            longitude : 1 ,
            latitude : 1
        } ,
        finishPos : {
            longitude : 11 ,
            latitude : 12
        }
    })
    .expect(200) ;
    const raceId = response1.body.raceId ;

    
    const raceDataString = await global.redisClient.get(`race:await:${raceId}`);
    expect(raceDataString).toBeDefined() ;
    const raceData = JSON.parse(raceDataString!) ;
    expect(raceData.user1).toBe('user-1');
    expect(raceData.user2).toBe('user-2');

    const response = await request(app)
        .post("/api/races/accept-race")
        .set("Authorization", `Bearer ${token2}`)
        .send({ raceId: raceId , accept: false })
        .expect(200);

    expect(response.body.accepted).toBe(false);
    expect(await global.redisClient.sismember('races:active' , raceId)).toBeFalsy() ;
    const race = await Race.findById(raceId) ;
    expect(race).toBeDefined() ;
    expect(race!.raceStatus).toEqual(RaceStatus.RaceCancelled) ;
}); 

