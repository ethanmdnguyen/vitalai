// Integration tests for POST /api/plans/generate and GET /api/plans/current.
// The Google Gemini SDK is mocked so tests run without a real API key.

const MOCK_AI_RESPONSE = JSON.stringify({
  workoutPlan: {
    monday: {
      focus: "Upper Body Strength",
      exercises: [
        { name: "Push-ups", sets: 3, reps: "12", notes: "Keep core tight" },
        { name: "Dumbbell Rows", sets: 3, reps: "10 each", notes: "" },
      ],
      duration_minutes: 45,
    },
    tuesday: null,
    wednesday: {
      focus: "Lower Body Power",
      exercises: [
        { name: "Squats", sets: 4, reps: "12", notes: "Knees aligned with toes" },
      ],
      duration_minutes: 50,
    },
    thursday: null,
    friday: {
      focus: "Full Body HIIT",
      exercises: [
        { name: "Burpees", sets: 3, reps: "10", notes: "" },
      ],
      duration_minutes: 40,
    },
    saturday: null,
    sunday: null,
  },
  mealPlan: {
    dailyCalorieTarget: 2400,
    macros: { protein_g: 180, carbs_g: 240, fat_g: 80 },
    breakfast: { name: "Oatmeal with Berries", ingredients: ["oats", "blueberries", "honey"], calories: 400 },
    lunch: { name: "Chicken Salad", ingredients: ["chicken breast", "lettuce", "olive oil"], calories: 550 },
    dinner: { name: "Salmon and Quinoa", ingredients: ["salmon", "quinoa", "broccoli"], calories: 700 },
    snack: { name: "Greek Yogurt", ingredients: ["Greek yogurt", "almonds"], calories: 250 },
  },
  notes: "Focus on progressive overload each week and prioritize sleep for muscle recovery.",
});

// Mock the Google Gemini SDK before any module imports resolve.
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue(MOCK_AI_RESPONSE),
        },
      }),
    }),
  })),
}));

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_plan",
  email: "testplan@example.com",
  password: "securepassword123",
};

let authToken;
let userId;

beforeAll(async () => {
  await pool.query("ALTER TABLE plans ADD COLUMN IF NOT EXISTS nutrition_notes TEXT");
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  const res = await request(app).post("/api/auth/register").send(testUser);
  authToken = res.body.token;
  userId = res.body.user.id;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  await pool.end();
});

describe("POST /api/plans/generate", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).post("/api/plans/generate");
    expect(res.status).toBe(401);
  });

  it("returns 400 when the user has no profile", async () => {
    const res = await request(app)
      .post("/api/plans/generate")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/profile/i);
  });

  it("saves and returns a plan when the user has a profile (Gemini mocked)", async () => {
    // Create the profile so the controller can proceed.
    await pool.query(
      `INSERT INTO profiles (user_id, age, weight_kg, height_cm, goal, diet_type, workout_days_per_week)
       VALUES ($1, 28, 75.5, 178, 'build_muscle', 'standard', 3)`,
      [userId]
    );

    const res = await request(app)
      .post("/api/plans/generate")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.workout_plan).toBeDefined();
    expect(res.body.meal_plan).toBeDefined();
    expect(res.body.notes).toBeDefined();
    expect(res.body.workout_plan.monday.focus).toBe("Upper Body Strength");
    expect(res.body.meal_plan.dailyCalorieTarget).toBe(2400);
  });
});

describe("GET /api/plans/current", () => {
  it("returns the most recently saved plan", async () => {
    const res = await request(app)
      .get("/api/plans/current")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.workout_plan).toBeDefined();
    expect(res.body.meal_plan).toBeDefined();
    expect(res.body.meal_plan.dailyCalorieTarget).toBe(2400);
  });
});
