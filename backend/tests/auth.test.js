// Integration tests for POST /api/auth/register and POST /api/auth/login.
// Runs against a real database — requires DATABASE_URL to be set in .env.

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_auth",
  email: "testauth@example.com",
  password: "securepassword123",
};

beforeAll(async () => {
  // Remove any leftover test user from a previous run.
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  await pool.end();
});

describe("POST /api/auth/register", () => {
  it("returns 201 with a token for valid registration data", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.username).toBe(testUser.username);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "incomplete@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 409 when email is already registered", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
  });
});

describe("POST /api/auth/login", () => {
  it("returns 200 with a token for correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
  });

  it("returns 401 for a wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});
