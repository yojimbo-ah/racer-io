import request from "supertest";
import { RaceStatus } from "@racer-io/common";
import { app } from "../../app";
import Race from "../../models/race-model";

// moking all the nats-wrapper from the mocks folder 
jest.mock("../../nats-wrapper")

describe("GET /api/races", () => {
    it("returns 401 when user is not authenticated", async () => {
        await request(app).get("/api/races").send().expect(401);
    });

    it("returns only races where current user is present", async () => {
        await Race.build({
            user1: "user-1",
            user2: "user-2",
            startPos: { longitude: 30, latitude: 31 },
            endingPos: { longitude: 30.001, latitude: 31.001 },
        }).save();

        await Race.build({
            user1: "other-1",
            user2: "other-2",
            startPos: { longitude: 30, latitude: 31 },
            endingPos: { longitude: 30.001, latitude: 31.001 },
        }).save();

        const token = getAuthToken("user-1");

        const response = await request(app)
            .get("/api/races")
            .set("Authorization", `Bearer ${token}`)
            .send()
            .expect(200);

        expect(response.body.races).toHaveLength(1);
        expect(response.body.races[0].users).toContain("user-1");
    });
});
