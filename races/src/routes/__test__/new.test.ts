import request from "supertest";
import { userStatus } from "@racer-io/common";
import { app } from "../../app";
import redis from "../../redis";
import Race from "../../models/race-model";


// moking all the nats-wrapper from the mocks folder 
jest.mock("../../nats-wrapper")


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
        
    })
});
