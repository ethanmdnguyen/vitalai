// Plan model — database queries for the plans table.
// workout_plan and meal_plan are stored as JSON strings and parsed on read.

const pool = require("../../db/pool");

async function savePlan(userId, weekStart, workoutPlan, mealPlan, notes, nutritionNotes) {
  const result = await pool.query(
    `INSERT INTO plans (user_id, week_start, workout_plan, meal_plan, notes, nutrition_notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, weekStart, JSON.stringify(workoutPlan), JSON.stringify(mealPlan), notes || null, nutritionNotes || null]
  );

  const row = result.rows[0];
  return {
    ...row,
    workout_plan: workoutPlan,
    meal_plan: mealPlan,
  };
}

async function getCurrentPlan(userId) {
  const result = await pool.query(
    "SELECT * FROM plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
    [userId]
  );

  if (!result.rows[0]) return null;

  const row = result.rows[0];
  return {
    ...row,
    workout_plan: typeof row.workout_plan === "string"
      ? JSON.parse(row.workout_plan)
      : row.workout_plan,
    meal_plan: typeof row.meal_plan === "string"
      ? JSON.parse(row.meal_plan)
      : row.meal_plan,
  };
}

async function updatePlanWorkout(userId, workoutPlan) {
  const result = await pool.query(
    `UPDATE plans
     SET workout_plan = $1
     WHERE id = (
       SELECT id FROM plans WHERE user_id = $2 ORDER BY created_at DESC LIMIT 1
     )
     RETURNING *`,
    [JSON.stringify(workoutPlan), userId]
  );

  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    ...row,
    workout_plan: workoutPlan,
    meal_plan: typeof row.meal_plan === "string" ? JSON.parse(row.meal_plan) : row.meal_plan,
  };
}

async function updatePlanMeal(userId, mealPlan) {
  const result = await pool.query(
    `UPDATE plans
     SET meal_plan = $1
     WHERE id = (
       SELECT id FROM plans WHERE user_id = $2 ORDER BY created_at DESC LIMIT 1
     )
     RETURNING *`,
    [JSON.stringify(mealPlan), userId]
  );

  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    ...row,
    workout_plan: typeof row.workout_plan === "string" ? JSON.parse(row.workout_plan) : row.workout_plan,
    meal_plan: mealPlan,
  };
}

module.exports = { savePlan, getCurrentPlan, updatePlanWorkout, updatePlanMeal };
