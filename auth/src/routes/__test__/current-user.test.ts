import request from "supertest";
import app from "../../app";

it("responds with details about the current user", async () => {
    const token = await getAuthToken();
    expect(token).toBeDefined();

    const response = await request(app)
        .get("/api/users/currentUser")
        .set("Authorization", `Bearer ${token}`)
        .send()
        .expect(200);

    expect(response.body.currentUser.email).toEqual("test@test.com");
});

it("returns status 200 with null currentUser if not signed in", async () => {
    const response = await request(app)
        .get("/api/users/currentUser")
        .set("Authorization", "Bearer invalid-token")
        .send()
        .expect(200);

    expect(response.body.currentUser).toBeNull();
});
