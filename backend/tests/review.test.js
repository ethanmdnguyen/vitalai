// Integration tests for POST /api/reviews/generate and GET /api/reviews.
// Gemini SDK is mocked so tests run without a real API key.

const MOCK_REVIEW_TEXT = `1. OVERVIEW: You had a solid week with consistent effort across your logs. You completed 2 workouts and stayed close to your calorie target most days.

2. WINS: First, you hit your calorie target of 2000 on multiple days — great discipline! Second, your energy levels averaged a strong 4/5 throughout the week.

3. IMPROVE: Your protein intake was below the 180g target on most days — try adding a protein shake post-workout. Also, sleep was under 7 hours on some nights, which can slow recovery.

4. NEXT WEEK: First, aim for 180g of protein daily by including chicken or Greek yogurt with each meal. Second, set a consistent 10pm bedtime to hit 7-8 hours of sleep. Third, track your water intake and aim for at least 2500ml per day.

5. MOTIVATION: You're building powerful habits one day at a time — keep showing up and the results will follow!`;

// Mock the Google Gemini SDK before any module imports resolve.
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue(MOCK_REVIEW_TEXT),
        },
      }),
    }),
  })),
}));

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_review",
  email: "testreview@example.com",
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

describe("POST /api/reviews/generate", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).post("/api/reviews/generate");
    expect(res.status).toBe(401);
  });

  it("returns 400 when the user has no profile", async () => {
    const res = await request(app)
      .post("/api/reviews/generate")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/profile/i);
  });

  it("returns 400 when the user has no plan", async () => {
    await pool.query(
      `INSERT INTO profiles (user_id, age, weight_kg, height_cm, goal, diet_type, workout_days_per_week)
       VALUES ($1, 25, 74.0, 175, 'lose_weight', 'standard', 3)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    const res = await request(app)
      .post("/api/reviews/generate")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/plan/i);
  });

  it("returns 400 when fewer than 3 logs exist this week", async () => {
    // Insert a plan so that check passes.
    await pool.query(
      `INSERT INTO plans (user_id, week_start, workout_plan, meal_plan, notes)
       VALUES ($1, date_trunc('week', CURRENT_DATE)::date, $2, $3, $4)`,
      [
        userId,
        JSON.stringify({ monday: null }),
        JSON.stringify({ dailyCalorieTarget: 2000, macros: { protein_g: 180, carbs_g: 200, fat_g: 60 } }),
        "Stay consistent.",
      ]
    );

    // Seed only 2 logs this week.
    await pool.query(
      `INSERT INTO daily_logs (user_id, log_date, workout_completed, calories)
       VALUES
         ($1, date_trunc('week', CURRENT_DATE)::date,     true,  2100),
         ($1, date_trunc('week', CURRENT_DATE)::date + 1, false, 1900)
       ON CONFLICT (user_id, log_date) DO NOTHING`,
      [userId]
    );

    const res = await request(app)
      .post("/api/reviews/generate")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/3 days/i);
  });

  it("generates and returns a review when 3+ logs exist (Gemini mocked)", async () => {
    // Add a third log to reach the minimum.
    await pool.query(
      `INSERT INTO daily_logs (user_id, log_date, workout_completed, calories)
       VALUES ($1, date_trunc('week', CURRENT_DATE)::date + 2, true, 2050)
       ON CONFLICT (user_id, log_date) DO NOTHING`,
      [userId]
    );

    const res = await request(app)
      .post("/api/reviews/generate")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.review).toBe(MOCK_REVIEW_TEXT);
    expect(res.body.weekStart).toBeDefined();
  });
});

describe("GET /api/reviews", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).get("/api/reviews");
    expect(res.status).toBe(401);
  });

  it("returns an array of past reviews for the user", async () => {
    const res = await request(app)
      .get("/api/reviews")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].review_text).toBeDefined();
    expect(res.body[0].week_start).toBeDefined();
  });
});
