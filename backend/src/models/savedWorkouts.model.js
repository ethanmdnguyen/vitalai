// Saved workouts model — database queries for the saved_workouts table.

const pool = require("../../db/pool");

async function getSavedWorkouts(userId) {
  const result = await pool.query(
    "SELECT * FROM saved_workouts WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

module.exports = { getSavedWorkouts };
