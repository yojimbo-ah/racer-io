import request from "supertest";
import { userStatus } from "@racer-io/common";
import app from "../../app";
import redis from "../../redis";

jest.mock("../../redis");

const redisMock = redis as unknown as {
    geosearch: jest.Mock;
    hget: jest.Mock;
};

describe("GET /api/positions/aroundme", () => {
    it("returns 401 when user is not authenticated", async () => {
        await request(app).get("/api/positions/aroundme").send().expect(401);
    });

    it("returns only nearby idle users and excludes current user", async () => {
        const currentUserId = "user-1";
        const token = getAuthToken(currentUserId);

        redisMock.geosearch.mockResolvedValue([
            currentUserId,
            "friend-1",
            "friend-2",
            "busy-1",
        ]);

        redisMock.hget.mockImplementation((key: string) => {
            if (key === `user:busy-1`) {
                return Promise.resolve(userStatus.InRace);
            }
            return Promise.resolve(userStatus.Idle);
        });

        const response = await request(app)
            .get("/api/positions/aroundme")
            .set("Authorization", `Bearer ${token}`)
            .send()
            .expect(200);

        expect(response.body.users).toEqual(["friend-1", "friend-2"]);
    });

    it("returns 400 when redis query fails", async () => {
        const token = getAuthToken("user-1");
        redisMock.geosearch.mockRejectedValue(new Error("redis down"));

        await request(app)
            .get("/api/positions/aroundme")
            .set("Authorization", `Bearer ${token}`)
            .send()
            .expect(400);
    });
});
