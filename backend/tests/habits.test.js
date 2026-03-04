// Integration tests for POST /api/habits and GET /api/habits.
// The Google Gemini SDK is mocked so tests run without a real API key.

const MOCK_ANALYSIS = `BODY: Alcohol is metabolized by the liver and disrupts REM sleep cycles. It also causes dehydration and increases cortisol levels, impacting recovery.

GOALS: This will slow your muscle recovery and reduce training performance tomorrow. One night won't derail progress, but consistency matters.

RECOVERY:
1. Drink 500ml of water immediately upon waking and continue hydrating throughout the day.
2. Eat a protein-rich breakfast to stabilize blood sugar and support recovery.
3. Take a 20-minute walk to boost circulation and clear metabolic waste.

ADJUSTED PLAN: Instead of your planned heavy lifting session, do a light 30-minute bodyweight circuit at 60% intensity. Focus on mobility work and avoid heavy compound lifts today.`;

// Mock the Google Gemini SDK before any module imports resolve.
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue(MOCK_ANALYSIS),
        },
      }),
    }),
  })),
}));

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_habits",
  email: "testhabits@example.com",
  password: "securepassword123",
};

const validHabits = {
  alcohol: { enabled: true, drinks: 3, type: "beer", hoursAgo: "8" },
  sleep: { enabled: true, hours: "6" },
  smoking: { enabled: false },
  cannabis: { enabled: false },
  substances: { enabled: false },
  junkFood: { enabled: true, description: "pizza and chips", calories: "800" },
  medication: { enabled: false },
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

describe("POST /api/habits", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app).post("/api/habits").send({ habits: validHabits });
    expect(res.status).toBe(401);
  });

  it("returns 400 when habits is missing", async () => {
    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 201 with valid habits and AI analysis", async () => {
    const res = await request(app)
      .post("/api/habits")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ habits: validHabits });
    expect(res.status).toBe(201);
    expect(res.body.habits).toBeDefined();
    expect(res.body.analysis).toBeDefined();
    expect(typeof res.body.analysis).toBe("string");
    expect(res.body.log_date).toBeDefined();
  }, 15000);
});

describe("GET /api/habits", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/habits");
    expect(res.status).toBe(401);
  });

  it("returns an array of habit logs", async () => {
    const res = await request(app)
      .get("/api/habits")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].habits).toBeDefined();
  });
});
