// Integration tests for GET /api/dashboard.
// Verifies auth guard, empty-state response, and correct aggregation with seeded logs.

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_dash",
  email: "testdash@example.com",
  password: "securepassword123",
};

let authToken;
let userId;

beforeAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  const res = await request(app).post("/api/auth/register").send(testUser);
  authToken = res.body.token;
  userId = res.body.user.id;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  await pool.end();
});

describe("GET /api/dashboard", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(401);
  });

  it("returns zeroed/empty data when the user has no logs", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.workoutsThisWeek).toBe(0);
    expect(res.body.streak).toBe(0);
    expect(res.body.currentWeight).toBeNull();
    expect(res.body.weightHistory).toEqual([]);
    expect(res.body.calorieHistory).toEqual([]);
  });

  it("returns correct workoutsThisWeek count with seeded logs", async () => {
    // Seed 3 logs: 2 with workout completed, 1 without.
    await pool.query(
      `INSERT INTO daily_logs (user_id, log_date, workout_completed, calories, weight_kg)
       VALUES
         ($1, CURRENT_DATE,     true,  2100, 74.5),
         ($1, CURRENT_DATE - 1, true,  1950, 74.7),
         ($1, CURRENT_DATE - 2, false, 2000, 74.9)
       ON CONFLICT (user_id, log_date) DO NOTHING`,
      [userId]
    );

    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.workoutsThisWeek).toBe(2);
    expect(res.body.streak).toBe(3);
    expect(res.body.currentWeight).toBe(74.5);
    expect(res.body.weightHistory.length).toBe(3);
    expect(res.body.calorieHistory.length).toBe(3);
  });
});
