// Integration tests for the /api/grocery endpoints.
// Gemini is mocked to return pre-categorized ingredient data.

const MOCK_GROCERY_RESPONSE = JSON.stringify([
  { ingredient: "oats",         meal_name: "Oatmeal with Berries", meal_type: "breakfast", category: "Grains & Carbs" },
  { ingredient: "blueberries",  meal_name: "Oatmeal with Berries", meal_type: "breakfast", category: "Produce" },
  { ingredient: "honey",        meal_name: "Oatmeal with Berries", meal_type: "breakfast", category: "Pantry" },
  { ingredient: "chicken breast", meal_name: "Chicken Salad",      meal_type: "lunch",     category: "Proteins" },
  { ingredient: "lettuce",      meal_name: "Chicken Salad",        meal_type: "lunch",     category: "Produce" },
  { ingredient: "olive oil",    meal_name: "Chicken Salad",        meal_type: "lunch",     category: "Pantry" },
  { ingredient: "salmon",       meal_name: "Salmon and Quinoa",    meal_type: "dinner",    category: "Proteins" },
  { ingredient: "quinoa",       meal_name: "Salmon and Quinoa",    meal_type: "dinner",    category: "Grains & Carbs" },
  { ingredient: "broccoli",     meal_name: "Salmon and Quinoa",    meal_type: "dinner",    category: "Produce" },
  { ingredient: "Greek yogurt", meal_name: "Greek Yogurt",         meal_type: "snack",     category: "Dairy & Eggs" },
  { ingredient: "almonds",      meal_name: "Greek Yogurt",         meal_type: "snack",     category: "Pantry" },
]);

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: { text: jest.fn().mockReturnValue(MOCK_GROCERY_RESPONSE) },
      }),
    }),
  })),
}));

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_grocery",
  email: "testgrocery@example.com",
  password: "securepassword123",
};

const noPlanUser = {
  username: "testuser_grocery_noplan",
  email: "testgrocery_noplan@example.com",
  password: "securepassword123",
};

const MOCK_MEAL_PLAN = JSON.stringify({
  dailyCalorieTarget: 1900,
  macros: { protein_g: 150, carbs_g: 200, fat_g: 60 },
  breakfast: { name: "Oatmeal with Berries", ingredients: ["oats", "blueberries", "honey"], calories: 400 },
  lunch:     { name: "Chicken Salad",        ingredients: ["chicken breast", "lettuce", "olive oil"], calories: 550 },
  dinner:    { name: "Salmon and Quinoa",    ingredients: ["salmon", "quinoa", "broccoli"], calories: 700 },
  snack:     { name: "Greek Yogurt",         ingredients: ["Greek yogurt", "almonds"], calories: 250 },
});

let authToken;
let noPlanToken;
let itemId;

beforeAll(async () => {
  // Main test user — gets a plan inserted directly.
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  const res = await request(app).post("/api/auth/register").send(testUser);
  authToken = res.body.token;
  const userId = res.body.user.id;

  await pool.query(
    `INSERT INTO plans (user_id, week_start, workout_plan, meal_plan, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, "2024-01-01", "{}", MOCK_MEAL_PLAN, "Test notes"]
  );

  // Second test user with NO plan, for the 400 test.
  await pool.query("DELETE FROM users WHERE email = $1", [noPlanUser.email]);
  const noPlanRes = await request(app).post("/api/auth/register").send(noPlanUser);
  noPlanToken = noPlanRes.body.token;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  await pool.query("DELETE FROM users WHERE email = $1", [noPlanUser.email]);
  await pool.end();
});

describe("POST /api/grocery/generate", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).post("/api/grocery/generate");
    expect(res.status).toBe(401);
  });

  it("returns 400 when user has no meal plan", async () => {
    const res = await request(app)
      .post("/api/grocery/generate")
      .set("Authorization", `Bearer ${noPlanToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/plan/i);
  });

  it("saves items and returns grouped categories (Gemini mocked)", async () => {
    const res = await request(app)
      .post("/api/grocery/generate")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
    const allItems = Object.values(res.body).flat();
    expect(allItems.length).toBe(11);
    expect(Object.keys(res.body)).toContain("Produce");
    expect(Object.keys(res.body)).toContain("Proteins");
    itemId = allItems[0].id;
  });
});

describe("GET /api/grocery", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).get("/api/grocery");
    expect(res.status).toBe(401);
  });

  it("returns grouped grocery items", async () => {
    const res = await request(app)
      .get("/api/grocery")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
    const allItems = Object.values(res.body).flat();
    expect(allItems.length).toBeGreaterThan(0);
    expect(allItems[0]).toHaveProperty("ingredient");
    expect(allItems[0]).toHaveProperty("checked");
  });
});

describe("PATCH /api/grocery/:id", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).patch(`/api/grocery/${itemId}`);
    expect(res.status).toBe(401);
  });

  it("toggles the checked status of an item", async () => {
    const res = await request(app)
      .patch(`/api/grocery/${itemId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(itemId);
    expect(typeof res.body.checked).toBe("boolean");
  });
});

describe("DELETE /api/grocery", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).delete("/api/grocery");
    expect(res.status).toBe(401);
  });

  it("clears all grocery items and returns a message", async () => {
    const res = await request(app)
      .delete("/api/grocery")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cleared/i);

    // Confirm the list is now empty.
    const listRes = await request(app)
      .get("/api/grocery")
      .set("Authorization", `Bearer ${authToken}`);
    expect(Object.values(listRes.body).flat().length).toBe(0);
  });
});
