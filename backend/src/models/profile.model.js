// Profile model — database queries for the profiles table.
// Uses INSERT ... ON CONFLICT to upsert so each user has exactly one profile.
// JSON array fields (workout_types, dietary_restrictions, secondary_goals) are
// stored as JSON strings in the DB and parsed back to arrays on read.

const pool = require("../../db/pool");

// Stringify a value if it's an array, pass through if already a string, null otherwise.
function toJsonOrNull(val) {
  if (val == null) return null;
  return Array.isArray(val) ? JSON.stringify(val) : val;
}

// Parse a JSON string field back to an array; return [] on null/invalid.
function parseJsonArray(val) {
  if (!val) return [];
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Attach parsed array fields to a raw profile row.
function parseProfile(row) {
  if (!row) return null;
  return {
    ...row,
    workout_types:        parseJsonArray(row.workout_types),
    dietary_restrictions: parseJsonArray(row.dietary_restrictions),
    secondary_goals:      parseJsonArray(row.secondary_goals),
  };
}

async function createOrUpdateProfile(userId, profileData) {
  const {
    // v1 fields
    age,
    weight_kg,
    height_cm,
    goal,
    diet_type,
    workout_days_per_week,
    workout_preferences,
    // v2 body & fitness
    unit_preference,
    fitness_level,
    body_fat_percent,
    injuries,
    workout_types,
    // v2 diet
    dietary_restrictions,
    dietary_notes,
    meal_prep_days,
    // v2 goals
    primary_goal,
    secondary_goals,
    goal_intensity,
    event_type,
    event_date,
    event_name,
  } = profileData;

  const result = await pool.query(
    `INSERT INTO profiles (
       user_id, age, weight_kg, height_cm, goal, diet_type,
       workout_days_per_week, workout_preferences,
       unit_preference, fitness_level, body_fat_percent, injuries,
       workout_types, dietary_restrictions, dietary_notes, meal_prep_days,
       primary_goal, secondary_goals, goal_intensity,
       event_type, event_date, event_name,
       updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       age                   = EXCLUDED.age,
       weight_kg             = EXCLUDED.weight_kg,
       height_cm             = EXCLUDED.height_cm,
       goal                  = EXCLUDED.goal,
       diet_type             = EXCLUDED.diet_type,
       workout_days_per_week = EXCLUDED.workout_days_per_week,
       workout_preferences   = EXCLUDED.workout_preferences,
       unit_preference       = EXCLUDED.unit_preference,
       fitness_level         = EXCLUDED.fitness_level,
       body_fat_percent      = EXCLUDED.body_fat_percent,
       injuries              = EXCLUDED.injuries,
       workout_types         = EXCLUDED.workout_types,
       dietary_restrictions  = EXCLUDED.dietary_restrictions,
       dietary_notes         = EXCLUDED.dietary_notes,
       meal_prep_days        = EXCLUDED.meal_prep_days,
       primary_goal          = EXCLUDED.primary_goal,
       secondary_goals       = EXCLUDED.secondary_goals,
       goal_intensity        = EXCLUDED.goal_intensity,
       event_type            = EXCLUDED.event_type,
       event_date            = EXCLUDED.event_date,
       event_name            = EXCLUDED.event_name,
       updated_at            = NOW()
     RETURNING *`,
    [
      userId,
      // INT columns — round to avoid "invalid input syntax for type integer" when
      // the frontend sends decimals (e.g. height from imperial ft→cm conversion).
      age          != null ? Math.round(Number(age))                   : null,
      weight_kg    != null ? parseFloat(Number(weight_kg).toFixed(2))  : null,
      height_cm    != null ? Math.round(Number(height_cm))             : null,
      goal ?? null,
      diet_type ?? null,
      workout_days_per_week != null ? Math.round(Number(workout_days_per_week)) : null,
      workout_preferences ?? null,
      unit_preference ?? "metric",
      fitness_level ?? null,
      body_fat_percent != null ? parseFloat(Number(body_fat_percent).toFixed(1)) : null,
      injuries ?? null,
      toJsonOrNull(workout_types),
      toJsonOrNull(dietary_restrictions),
      dietary_notes ?? null,
      meal_prep_days != null ? Math.round(Number(meal_prep_days)) : null,
      primary_goal ?? null,
      toJsonOrNull(secondary_goals),
      goal_intensity ?? null,
      event_type ?? null,
      event_date ?? null,
      event_name ?? null,
    ]
  );

  return parseProfile(result.rows[0]);
}

async function getProfileByUserId(userId) {
  const result = await pool.query(
    "SELECT * FROM profiles WHERE user_id = $1",
    [userId]
  );
  return parseProfile(result.rows[0] || null);
}

module.exports = { createOrUpdateProfile, getProfileByUserId };
