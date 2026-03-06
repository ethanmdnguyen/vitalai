// Reads schema.sql and runs it against the database specified in DATABASE_URL.
// Run with: node db/migrate.js

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function migrate() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log("Connected to database.");

    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    await client.query(schemaSql);

    // Ensure profiles.user_id has a unique constraint (required for upsert).
    await client.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id)"
    );

    // v1 migrations — safe to re-run on existing databases.
    await client.query("ALTER TABLE plans ADD COLUMN IF NOT EXISTS notes TEXT");

    // v2 migrations — profiles new columns.
    const profileAlters = [
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unit_preference VARCHAR(10) DEFAULT 'metric'",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_level VARCHAR(20)",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_fat_percent DECIMAL(4,1)",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS injuries TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS workout_types TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dietary_notes TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meal_prep_days INT DEFAULT 2",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS primary_goal VARCHAR(100)",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_goals TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal_intensity VARCHAR(50)",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS event_type VARCHAR(100)",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS event_date DATE",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS event_name VARCHAR(255)",
    ];

    for (const sql of profileAlters) {
      await client.query(sql);
    }

    // v2 migrations — daily_logs new columns.
    await client.query("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS meals_log TEXT");
    await client.query("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS workout_log TEXT");

    // v3 migrations — profiles new columns.
    await client.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS steps_goal INT DEFAULT 10000");
    await client.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS morning_checkin_enabled BOOLEAN DEFAULT TRUE");

    // v3 migrations — plans new columns.
    await client.query("ALTER TABLE plans ADD COLUMN IF NOT EXISTS nutrition_notes TEXT");

    // v3 migrations — daily_logs new columns.
    await client.query("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS steps INT");
    await client.query("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS distance_km DECIMAL(6,2)");
    await client.query("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS floors_climbed INT");
    await client.query("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS morning_energy INT CHECK(morning_energy BETWEEN 1 AND 5)");
    await client.query("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS morning_focus TEXT");

    console.log("Migration complete: all tables and columns applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
