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
  -- v1 fields (kept for backwards compatibility)
  age INT,
  weight_kg DECIMAL(5,2),
  height_cm INT,
  goal VARCHAR(50),
  diet_type VARCHAR(50),
  workout_days_per_week INT,
  workout_preferences TEXT,
  -- v2 body & fitness fields
  unit_preference VARCHAR(10) DEFAULT 'metric',
  fitness_level VARCHAR(20),
  body_fat_percent DECIMAL(4,1),
  injuries TEXT,
  -- v2 workout preferences (JSON arrays stored as text)
  workout_types TEXT,
  -- v2 diet fields
  dietary_restrictions TEXT,
  dietary_notes TEXT,
  meal_prep_days INT DEFAULT 2,
  -- v2 goal fields
  primary_goal VARCHAR(100),
  secondary_goals TEXT,
  goal_intensity VARCHAR(50),
  event_type VARCHAR(100),
  event_date DATE,
  event_name VARCHAR(255),
  -- v3 fields
  steps_goal INT DEFAULT 10000,
  morning_checkin_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE,
  workout_plan TEXT,
  meal_plan TEXT,
  notes TEXT,
  nutrition_notes TEXT,
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
  meals_log TEXT,
  workout_log TEXT,
  -- v3 fields
  steps INT,
  distance_km DECIMAL(6,2),
  floors_climbed INT,
  morning_energy INT CHECK(morning_energy BETWEEN 1 AND 5),
  morning_focus TEXT,
  UNIQUE(user_id, log_date)
);

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE,
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  meal_type VARCHAR(50),
  ingredients TEXT NOT NULL,
  instructions TEXT,
  macros TEXT,
  prep_time_minutes INT,
  cook_time_minutes INT,
  servings DECIMAL(4,1) DEFAULT 1,
  external_recipe_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  ingredient VARCHAR(255) NOT NULL,
  meal_name VARCHAR(255),
  meal_type VARCHAR(50),
  category VARCHAR(100),
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- v3 tables

CREATE TABLE IF NOT EXISTS bad_habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  habits JSONB NOT NULL DEFAULT '[]',
  ai_analysis TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'personal',
  due_date DATE,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'day',
  exercises TEXT NOT NULL,
  muscle_groups TEXT,
  estimated_duration_minutes INT,
  estimated_calories INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
