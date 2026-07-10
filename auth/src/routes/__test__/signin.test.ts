import request from "supertest";
import app from "../../app";

// moking all the nats-wrapper from the mocks folder 
jest.mock("../../nats-wrapper");

it("returns 400 when user is not found", async () => {
    await request(app)
        .post("/api/users/signin")
        .send({
            email: "test@test.com",
            password: "kakds",
        })
        .expect(400);
});

it("returns 400 with invalid credentials", async () => {
    const token = await getAuthToken();
    expect(token).toBeDefined();

    await request(app)
        .post("/api/users/signin")
        .send({
            email: "test@test.com",
            password: "wrong-password",
        })
        .expect(400);
});

it("returns 201 and token for valid credentials", async () => {
    const token = await getAuthToken();
    expect(token).toBeDefined();

    const response = await request(app)
        .post("/api/users/signin")
        .send({
            email: "test@test.com",
            password: "password",
        })
        .expect(201);

    expect(response.body.token).toBeDefined();
});