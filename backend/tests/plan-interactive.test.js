// Integration tests for PATCH /api/plans/current, POST /api/plans/swap-exercise, POST /api/plans/swap-meal.
// Gemini is mocked — exercise and meal alternative responses alternate by call order.

jest.mock("@google/generative-ai", () => {
  const EXERCISE_RESPONSE = JSON.stringify([
    { name: "Pull-ups",                    sets: 3, reps: "8",  notes: "Use bands if needed", primary_muscles: ["Back"],      secondary_muscles: ["Biceps"]    },
    { name: "Cable Rows",                  sets: 3, reps: "12", notes: "",                    primary_muscles: ["Back"],      secondary_muscles: ["Biceps"]    },
    { name: "Resistance Band Pull-aparts", sets: 3, reps: "15", notes: "",                    primary_muscles: ["Back"],      secondary_muscles: ["Shoulders"] },
  ]);
  const MEAL_RESPONSE = JSON.stringify([
    { name: "Greek Chicken Bowl", calories: 520, ingredients: ["chicken", "greek yogurt"],  macros: { protein_g: 45, carbs_g: 30, fat_g: 18 } },
    { name: "Tuna Salad Wrap",    calories: 480, ingredients: ["tuna", "whole wheat wrap"], macros: { protein_g: 40, carbs_g: 35, fat_g: 14 } },
    { name: "Lentil Soup",        calories: 450, ingredients: ["red lentils", "spinach"],   macros: { protein_g: 28, carbs_g: 60, fat_g: 8  } },
  ]);
  let callCount = 0;
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockImplementation(() =>
          Promise.resolve({
            response: { text: jest.fn().mockReturnValue(callCount++ === 0 ? EXERCISE_RESPONSE : MEAL_RESPONSE) },
          })
        ),
      }),
    })),
  };
});

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_plan_interactive",
  email: "testplaninteractive@example.com",
  password: "securepassword123",
};

const INITIAL_WORKOUT_PLAN = JSON.stringify({
  monday:    { focus: "Upper Body", exercises: [{ name: "Push-ups", sets: 3, reps: "12", notes: "" }], duration_minutes: 45 },
  tuesday:   null,
  wednesday: null,
  thursday:  null,
  friday:    null,
  saturday:  null,
  sunday:    null,
});

const INITIAL_MEAL_PLAN = JSON.stringify({
  dailyCalorieTarget: 2000,
  macros: { protein_g: 150, carbs_g: 200, fat_g: 65 },
  breakfast: { name: "Oatmeal",       ingredients: ["oats", "milk"],              calories: 350 },
  lunch:     { name: "Chicken Wrap",  ingredients: ["chicken", "wrap"],           calories: 500 },
  dinner:    { name: "Stir Fry",      ingredients: ["beef", "vegetables"],        calories: 650 },
  snack:     { name: "Apple",         ingredients: ["apple"],                     calories: 100 },
});

let authToken;
let userId;

beforeAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  const res = await request(app).post("/api/auth/register").send(testUser);
  authToken = res.body.token;
  userId = res.body.user.id;

  await pool.query(
    `INSERT INTO plans (user_id, week_start, workout_plan, meal_plan, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, "2024-01-01", INITIAL_WORKOUT_PLAN, INITIAL_MEAL_PLAN, ""]
  );

  await pool.query(
    `INSERT INTO profiles (user_id, age, weight_kg, height_cm, goal, diet_type, workout_days_per_week)
     VALUES ($1, 30, 80, 180, 'general_fitness', 'standard', 3)`,
    [userId]
  );
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  await pool.end();
});

describe("PATCH /api/plans/current", () => {
  it("updates the workout plan", async () => {
    const updatedWorkout = {
      monday:    { focus: "Chest Day", exercises: [{ name: "Bench Press", sets: 4, reps: "10", notes: "" }], duration_minutes: 50 },
      tuesday:   null,
      wednesday: null,
      thursday:  null,
      friday:    null,
      saturday:  null,
      sunday:    null,
    };

    const res = await request(app)
      .patch("/api/plans/current")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ workoutPlan: updatedWorkout });

    expect(res.status).toBe(200);
    expect(res.body.workout_plan.monday.focus).toBe("Chest Day");
    expect(res.body.workout_plan.monday.exercises[0].name).toBe("Bench Press");
  });

  it("updates the meal plan", async () => {
    const updatedMeal = {
      dailyCalorieTarget: 2200,
      macros: { protein_g: 170, carbs_g: 220, fat_g: 70 },
      breakfast: { name: "Eggs and Toast", ingredients: ["eggs", "toast"],                calories: 400 },
      lunch:     { name: "Salmon Bowl",    ingredients: ["salmon", "rice"],                calories: 600 },
      dinner:    { name: "Pasta",          ingredients: ["pasta", "tomato sauce"],         calories: 700 },
      snack:     { name: "Protein Bar",    ingredients: ["protein bar"],                   calories: 200 },
    };

    const res = await request(app)
      .patch("/api/plans/current")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ mealPlan: updatedMeal });

    expect(res.status).toBe(200);
    expect(res.body.meal_plan.dailyCalorieTarget).toBe(2200);
    expect(res.body.meal_plan.breakfast.name).toBe("Eggs and Toast");
  });
});

describe("POST /api/plans/swap-exercise", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app)
      .post("/api/plans/swap-exercise")
      .send({ exerciseName: "Push-ups", primaryMuscle: "Chest" });

    expect(res.status).toBe(401);
  });

  it("returns 3 exercise alternatives (Gemini mocked)", async () => {
    const res = await request(app)
      .post("/api/plans/swap-exercise")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ exerciseName: "Dumbbell Rows", primaryMuscle: "Back" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.alternatives)).toBe(true);
    expect(res.body.alternatives).toHaveLength(3);
    expect(res.body.alternatives[0]).toHaveProperty("name");
    expect(res.body.alternatives[0]).toHaveProperty("sets");
    expect(res.body.alternatives[0]).toHaveProperty("reps");
  });
});

describe("POST /api/plans/swap-meal", () => {
  it("returns 3 meal alternatives (Gemini mocked)", async () => {
    const res = await request(app)
      .post("/api/plans/swap-meal")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ mealType: "lunch", calorieTarget: 500 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.alternatives)).toBe(true);
    expect(res.body.alternatives).toHaveLength(3);
    expect(res.body.alternatives[0]).toHaveProperty("name");
    expect(res.body.alternatives[0]).toHaveProperty("calories");
    expect(res.body.alternatives[0]).toHaveProperty("ingredients");
  });
});
