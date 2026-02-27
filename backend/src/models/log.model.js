// Log model — database queries for the daily_logs table.
// The table has UNIQUE(user_id, log_date) so upserts work without extra schema changes.

const pool = require("../../db/pool");

async function saveLog(userId, logData) {
  const {
    log_date,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    water_ml,
    sleep_hours,
    energy_level,
    weight_kg,
    workout_completed,
    notes,
    meals_log,
    workout_log,
  } = logData;

  const result = await pool.query(
    `INSERT INTO daily_logs
       (user_id, log_date, calories, protein_g, carbs_g, fat_g,
        water_ml, sleep_hours, energy_level, weight_kg, workout_completed, notes,
        meals_log, workout_log)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (user_id, log_date) DO UPDATE SET
       calories          = EXCLUDED.calories,
       protein_g         = EXCLUDED.protein_g,
       carbs_g           = EXCLUDED.carbs_g,
       fat_g             = EXCLUDED.fat_g,
       water_ml          = EXCLUDED.water_ml,
       sleep_hours       = EXCLUDED.sleep_hours,
       energy_level      = EXCLUDED.energy_level,
       weight_kg         = EXCLUDED.weight_kg,
       workout_completed = EXCLUDED.workout_completed,
       notes             = EXCLUDED.notes,
       meals_log         = EXCLUDED.meals_log,
       workout_log       = EXCLUDED.workout_log
     RETURNING *`,
    [
      userId,
      log_date,
      calories ?? null,
      protein_g ?? null,
      carbs_g ?? null,
      fat_g ?? null,
      water_ml ?? null,
      sleep_hours ?? null,
      energy_level ?? null,
      weight_kg ?? null,
      workout_completed ?? false,
      notes ?? null,
      meals_log ?? null,
      workout_log ?? null,
    ]
  );

  return result.rows[0];
}

async function getLogByDate(userId, date) {
  const result = await pool.query(
    "SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = $2",
    [userId, date]
  );
  return result.rows[0] || null;
}

async function getLogsForWeek(userId, weekStart) {
  const result = await pool.query(
    `SELECT * FROM daily_logs
     WHERE user_id = $1
       AND log_date >= $2
       AND log_date <= $2::date + interval '6 days'
     ORDER BY log_date`,
    [userId, weekStart]
  );
  return result.rows;
}

module.exports = { saveLog, getLogByDate, getLogsForWeek };
