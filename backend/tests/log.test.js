// Integration tests for POST /api/logs and GET /api/logs/today.
// Registers a fresh user in beforeAll and cleans up in afterAll.

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_log",
  email: "testlog@example.com",
  password: "securepassword123",
};

const validLog = {
  calories: 2100,
  protein_g: 160,
  carbs_g: 220,
  fat_g: 70,
  water_ml: 2500,
  sleep_hours: 7.5,
  energy_level: 4,
  weight_kg: 74.8,
  workout_completed: true,
  notes: "Felt strong today.",
};

let authToken;

beforeAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  const res = await request(app).post("/api/auth/register").send(testUser);
  authToken = res.body.token;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  await pool.end();
});

describe("POST /api/logs", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).post("/api/logs").send(validLog);
    expect(res.status).toBe(401);
  });

  it("returns 200 and saves the log with valid data", async () => {
    const res = await request(app)
      .post("/api/logs")
      .set("Authorization", `Bearer ${authToken}`)
      .send(validLog);

    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(validLog.calories);
    expect(res.body.energy_level).toBe(validLog.energy_level);
    expect(res.body.workout_completed).toBe(true);
  });

  it("returns 200 and updates the existing log on a second POST (upsert)", async () => {
    const updatedLog = { ...validLog, calories: 2400, energy_level: 5, notes: "Even better today." };

    const res = await request(app)
      .post("/api/logs")
      .set("Authorization", `Bearer ${authToken}`)
      .send(updatedLog);

    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(2400);
    expect(res.body.energy_level).toBe(5);
    expect(res.body.notes).toBe("Even better today.");
  });

  it("returns 400 when energy_level is out of range", async () => {
    const res = await request(app)
      .post("/api/logs")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ ...validLog, energy_level: 9 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/energy_level/i);
  });

  it("saves meals_log and workout_log JSON strings and returns them", async () => {
    const mealsLog = JSON.stringify({
      breakfast: [{ id: "1", name: "Oatmeal", calories: 400, protein_g: 15, carbs_g: 60, fat_g: 8 }],
      lunch: [], dinner: [], snack: [],
    });
    const workoutLog = JSON.stringify({
      completedExIds: [0, 1],
      extraExercises: [{ name: "Plank", sets: "3", reps: "60s" }],
      skipReason: "",
    });

    // Use the same values as the upsert test so the GET test below still sees 2400/5.
    const res = await request(app)
      .post("/api/logs")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ ...validLog, calories: 2400, energy_level: 5, meals_log: mealsLog, workout_log: workoutLog });

    expect(res.status).toBe(200);
    expect(res.body.meals_log).toBe(mealsLog);
    expect(res.body.workout_log).toBe(workoutLog);
  });
});

describe("GET /api/logs/today", () => {
  it("returns today's log for the authenticated user", async () => {
    const res = await request(app)
      .get("/api/logs/today")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(2400); // set by the upsert test above
    expect(res.body.energy_level).toBe(5);
  });
});
