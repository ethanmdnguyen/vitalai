-- VitalAI database schema.
-- Run via migrate.js to create all tables if they don't already exist.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  age INT,
  weight_kg DECIMAL(5,2),
  height_cm INT,
  goal VARCHAR(50),
  diet_type VARCHAR(50),
  workout_days_per_week INT,
  workout_preferences TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE,
  workout_plan TEXT,
  meal_plan TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  calories INT,
  protein_g INT,
  carbs_g INT,
  fat_g INT,
  water_ml INT,
  sleep_hours DECIMAL(4,2),
  energy_level INT CHECK(energy_level BETWEEN 1 AND 5),
  weight_kg DECIMAL(5,2),
  workout_completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  UNIQUE(user_id, log_date)
);

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE,
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
