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
    // CREATE UNIQUE INDEX IF NOT EXISTS is safe to run on existing databases.
    await client.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id)"
    );
    console.log("Migration complete: all tables created successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
