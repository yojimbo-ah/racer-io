import request from "supertest";
import { app } from "../../app";
import Race from "../../models/race-model";
import redis from "../../redis";

jest.mock("../../redis");

const redisMock = redis as unknown as {
    get: jest.Mock;
    set: jest.Mock;
    sadd: jest.Mock;
    pipeline: jest.Mock;
};

const pipelineMock = {
    hset: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
};

describe("POST /api/races/accept-race", () => {
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
        const race = await Race.build({
            user1: "user-1",
            user2: "user-2",
            startPos: { longitude: 30, latitude: 31 },
            endingPos: { longitude: 30.001, latitude: 31.001 },
        }).save();

        redisMock.get.mockResolvedValue(JSON.stringify({ user1: "user-1", user2: "user-2" }));
        redisMock.set.mockResolvedValue("OK");
        redisMock.sadd.mockResolvedValue(1);
        redisMock.pipeline.mockReturnValue(pipelineMock);

        const token = getAuthToken("user-2");

        const response = await request(app)
            .post("/api/races/accept-race")
            .set("Authorization", `Bearer ${token}`)
            .send({ raceId: race._id.toString(), accept: true })
            .expect(200);

        expect(response.body.accepted).toBe(true);
        expect(redisMock.set).toHaveBeenCalled();
        expect(redisMock.sadd).toHaveBeenCalledWith("races:active", race._id.toString());
        expect(pipelineMock.exec).toHaveBeenCalled();
    });

    it("cancels race request when accept is false", async () => {
        const race = await Race.build({
            user1: "user-1",
            user2: "user-2",
            startPos: { longitude: 30, latitude: 31 },
            endingPos: { longitude: 30.001, latitude: 31.001 },
        }).save();

        redisMock.get.mockResolvedValue(JSON.stringify({ user1: "user-1", user2: "user-2" }));

        const token = getAuthToken("user-2");

        const response = await request(app)
            .post("/api/races/accept-race")
            .set("Authorization", `Bearer ${token}`)
            .send({ raceId: race._id.toString(), accept: false })
            .expect(200);

        expect(response.body.accepted).toBe(false);
    });
});
