// Profile model — database queries for the profiles table.
// Uses INSERT ... ON CONFLICT to upsert so each user has exactly one profile.

const pool = require("../../db/pool");

async function createOrUpdateProfile(userId, profileData) {
  const {
    age,
    weight_kg,
    height_cm,
    goal,
    diet_type,
    workout_days_per_week,
    workout_preferences,
  } = profileData;

  const result = await pool.query(
    `INSERT INTO profiles
       (user_id, age, weight_kg, height_cm, goal, diet_type, workout_days_per_week, workout_preferences, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       age                   = EXCLUDED.age,
       weight_kg             = EXCLUDED.weight_kg,
       height_cm             = EXCLUDED.height_cm,
       goal                  = EXCLUDED.goal,
       diet_type             = EXCLUDED.diet_type,
       workout_days_per_week = EXCLUDED.workout_days_per_week,
       workout_preferences   = EXCLUDED.workout_preferences,
       updated_at            = NOW()
     RETURNING *`,
    [userId, age, weight_kg, height_cm, goal, diet_type, workout_days_per_week, workout_preferences || null]
  );

  return result.rows[0];
}

async function getProfileByUserId(userId) {
  const result = await pool.query(
    "SELECT * FROM profiles WHERE user_id = $1",
    [userId]
  );
  return result.rows[0] || null;
}

module.exports = { createOrUpdateProfile, getProfileByUserId };
