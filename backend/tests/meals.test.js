// Integration tests for GET/POST/DELETE /api/meals (saved meals library).

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_meals",
  email: "testmeals@example.com",
  password: "securepassword123",
};

let authToken;
let savedMealId;

beforeAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  const res = await request(app).post("/api/auth/register").send(testUser);
  authToken = res.body.token;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  await pool.end();
});

describe("POST /api/meals", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app)
      .post("/api/meals")
      .send({ name: "Test", ingredients: ["oats"] });
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ ingredients: ["oats"] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it("returns 400 when ingredients is missing", async () => {
    const res = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Oatmeal" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ingredients/i);
  });

  it("saves a meal and returns 201 with parsed data", async () => {
    const res = await request(app)
      .post("/api/meals")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Overnight Oats",
        meal_type: "breakfast",
        ingredients: ["oats", "milk", "banana"],
        macros: { protein_g: 15, carbs_g: 50, fat_g: 5 },
        prep_time_minutes: 5,
        cook_time_minutes: 0,
        servings: 1,
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Overnight Oats");
    expect(res.body.meal_type).toBe("breakfast");
    expect(Array.isArray(res.body.ingredients)).toBe(true);
    expect(res.body.ingredients).toContain("oats");
    expect(res.body.macros.protein_g).toBe(15);
    savedMealId = res.body.id;
  });
});

describe("GET /api/meals", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).get("/api/meals");
    expect(res.status).toBe(401);
  });

  it("returns an array of saved meals", async () => {
    const res = await request(app)
      .get("/api/meals")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toBe("Overnight Oats");
  });
});

describe("DELETE /api/meals/:id", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).delete(`/api/meals/${savedMealId}`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for a non-existent meal id", async () => {
    const res = await request(app)
      .delete("/api/meals/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(404);
  });

  it("deletes the meal and returns 200", async () => {
    const res = await request(app)
      .delete(`/api/meals/${savedMealId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("confirms the meal no longer appears in GET /api/meals", async () => {
    const res = await request(app)
      .get("/api/meals")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.find((m) => m.id === savedMealId)).toBeUndefined();
  });
});
