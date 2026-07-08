import request from "supertest";
import { userStatus } from "@racer-io/common";
import { app } from "../../app";
import redis from "../../redis";
import Race from "../../models/race-model";

jest.mock("../../redis");

const redisMock = redis as unknown as {
    exists: jest.Mock;
    hgetall: jest.Mock;
    set: jest.Mock;
};

describe("POST /api/races/new", () => {
    it("returns 401 when user is not authenticated", async () => {
        await request(app)
            .post("/api/races/new")
            .send({})
            .expect(401);
    });

    it("returns 400 for invalid request payload", async () => {
        const token = getAuthToken();

        await request(app)
            .post("/api/races/new")
            .set("Authorization", `Bearer ${token}`)
            .send({
                startPos: { longitude: 10, latitude: 10 },
            })
            .expect(400);
    });

    it("creates a race when payload is valid", async () => {
        const token = getAuthToken("user-1");

        redisMock.exists.mockResolvedValue(true);
        redisMock.hgetall
            .mockResolvedValueOnce({
                userStatus: userStatus.Idle,
                latitude: "31",
                longitude: "30",
                raceId: "",
            })
            .mockResolvedValueOnce({
                userStatus: userStatus.Idle,
                latitude: "31",
                longitude: "30",
                raceId: "",
            });
        redisMock.set.mockResolvedValue("OK");

        const response = await request(app)
            .post("/api/races/new")
            .set("Authorization", `Bearer ${token}`)
            .send({
                friendId: "user-2",
                startPos: { longitude: 30, latitude: 31 },
                finishPos: { longitude: 30.001, latitude: 31.001 },
            })
            .expect(200);

        expect(response.body.message).toBeDefined();
        expect(redisMock.set).toHaveBeenCalled();

        const races = await Race.find({});
        expect(races).toHaveLength(1);
    });
});
