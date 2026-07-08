import jwt from "jsonwebtoken";

declare global {
    var getAuthToken: (id?: string, email?: string) => string;
}

beforeAll(() => {
    process.env.NODE_ENV = "test";
    process.env.JWT_KEY = process.env.JWT_KEY || "supersecretpassword";
});

beforeEach(() => {
    jest.clearAllMocks();
});

global.getAuthToken = (id = "test-user-id", email = "test@test.com") => {
    return jwt.sign(
        {
            id,
            email,
        },
        process.env.JWT_KEY!
    );
};
