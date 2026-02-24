// Integration tests for GET and POST /api/profile.
// Registers a fresh user in beforeAll to obtain an auth token, cleans up in afterAll.

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_profile",
  email: "testprofile@example.com",
  password: "securepassword123",
};

const testProfile = {
  age: 28,
  weight_kg: 75.5,
  height_cm: 178,
  goal: "build_muscle",
  diet_type: "standard",
  workout_days_per_week: 4,
  workout_preferences: "I like lifting weights and HIIT",
};

let authToken;

beforeAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  const res = await request(app).post("/api/auth/register").send(testUser);
  authToken = res.body.token;
});

afterAll(async () => {
  // Deleting the user cascades to profiles.
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  await pool.end();
});

describe("POST /api/profile", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).post("/api/profile").send(testProfile);
    expect(res.status).toBe(401);
  });

  it("returns 200 and saves the profile with valid data", async () => {
    const res = await request(app)
      .post("/api/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send(testProfile);

    expect(res.status).toBe(200);
    expect(res.body.age).toBe(testProfile.age);
    expect(res.body.goal).toBe(testProfile.goal);
    expect(res.body.diet_type).toBe(testProfile.diet_type);
  });

  it("returns 200 on a second POST and updates the existing profile (upsert)", async () => {
    const updatedProfile = { ...testProfile, age: 30, weight_kg: 73.0 };

    const res = await request(app)
      .post("/api/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send(updatedProfile);

    expect(res.status).toBe(200);
    expect(res.body.age).toBe(30);
    expect(parseFloat(res.body.weight_kg)).toBeCloseTo(73.0, 1);
  });
});

describe("GET /api/profile", () => {
  it("returns the saved profile for the authenticated user", async () => {
    const res = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.goal).toBe(testProfile.goal);
    expect(res.body.workout_days_per_week).toBe(testProfile.workout_days_per_week);
  });
});
