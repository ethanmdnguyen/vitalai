// Plan model — database queries for the plans table.
// workout_plan and meal_plan are stored as JSON strings and parsed on read.

const pool = require("../../db/pool");

async function savePlan(userId, weekStart, workoutPlan, mealPlan, notes) {
  const result = await pool.query(
    `INSERT INTO plans (user_id, week_start, workout_plan, meal_plan, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, weekStart, JSON.stringify(workoutPlan), JSON.stringify(mealPlan), notes || null]
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

module.exports = { savePlan, getCurrentPlan };
