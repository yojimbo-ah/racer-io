import request from "supertest";
import app from "../../app";

// moking all the nats-wrapper from the mocks folder 
jest.mock("../../nats-wrapper");

it("returns 201 on successful signup", async () => {
    await request(app)
        .post("/api/users/signup")
        .send({
            email: "test@test.com",
            password: "testtest",
            userName: "test-user",
        })
        .expect(201);
});

it("returns 400 when email is invalid", async () => {
    await request(app)
        .post("/api/users/signup")
        .send({
            email: "invalid-email",
            password: "testtest",
            userName: "test-user",
        })
        .expect(400);
});

it("returns 400 when required fields are missing", async () => {
    await request(app)
        .post("/api/users/signup")
        .send({
            email: "",
            password: "",
            userName: "",
        })
        .expect(400);
});

it("disallows duplicate emails", async () => {
    await request(app)
        .post("/api/users/signup")
        .send({
            email: "test@test.com",
            password: "askaskd",
            userName: "test-user",
        })
        .expect(201);

    await request(app)
        .post("/api/users/signup")
        .send({
            email: "test@test.com",
            password: "askaskd",
            userName: "test-user-2",
        })
        .expect(400);
});

it("returns token on successful signup", async () => {
    const response = await request(app)
        .post("/api/users/signup")
        .send({
            email: "cookie@test.com",
            password: "askaskd",
            userName: "cookie-user",
        })
        .expect(201);

    expect(response.body.token).toBeDefined();
});