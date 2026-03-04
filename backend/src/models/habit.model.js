// Habit model — stores and retrieves bad habit logs from the bad_habit_logs table.
// Auto-creates the table on first use via CREATE TABLE IF NOT EXISTS.

const pool = require("../../db/pool");

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bad_habit_logs (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      log_date   DATE    NOT NULL DEFAULT CURRENT_DATE,
      habits     JSONB   NOT NULL,
      analysis   TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, log_date)
    )
  `);
  // Idempotent column addition for tables created before analysis column existed.
  await pool.query(`
    ALTER TABLE bad_habit_logs ADD COLUMN IF NOT EXISTS analysis TEXT
  `);
  // Idempotent unique constraint for tables created without it.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'bad_habit_logs_user_id_log_date_key'
          AND conrelid = 'bad_habit_logs'::regclass
      ) THEN
        ALTER TABLE bad_habit_logs
          ADD CONSTRAINT bad_habit_logs_user_id_log_date_key UNIQUE (user_id, log_date);
      END IF;
    END $$
  `);
}

async function saveHabitLog(userId, logDate, habits, analysis) {
  await ensureTable();
  const result = await pool.query(
    `INSERT INTO bad_habit_logs (user_id, log_date, habits, analysis)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, log_date) DO UPDATE SET
       habits   = EXCLUDED.habits,
       analysis = EXCLUDED.analysis
     RETURNING *`,
    [userId, logDate, JSON.stringify(habits), analysis ?? null]
  );
  return result.rows[0];
}

async function getHabitLogs(userId, limit = 10) {
  await ensureTable();
  const result = await pool.query(
    `SELECT * FROM bad_habit_logs
     WHERE user_id = $1
     ORDER BY log_date DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

async function getHabitLogByDate(userId, logDate) {
  await ensureTable();
  const result = await pool.query(
    `SELECT * FROM bad_habit_logs
     WHERE user_id = $1 AND log_date = $2`,
    [userId, logDate]
  );
  return result.rows[0] || null;
}

module.exports = { saveHabitLog, getHabitLogs, getHabitLogByDate };
