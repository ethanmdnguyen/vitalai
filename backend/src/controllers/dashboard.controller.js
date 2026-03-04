// Dashboard controller — aggregates real log data into a single summary response.
// All date filtering happens in PostgreSQL (CURRENT_DATE) to avoid JS timezone issues.
// log_date is cast to ::text so it arrives as "YYYY-MM-DD" regardless of pg version.

const pool = require("../../db/pool");
const { getProfileByUserId } = require("../models/profile.model");

// Day-of-week index → plan key
const DAYS_OF_WEEK = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

function parseJsonField(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

async function getDashboardData(req, res) {
  const userId = req.user.id;

  // Run all DB queries in parallel.
  const [
    { rows: last14Logs },
    { rows: last7Logs },
    { rows: weightRows },
    { rows: planRows },
    { rows: streakRows },
    { rows: todayLogRows },
    profile,
  ] = await Promise.all([

    // Past 14 days — used for weight history chart.
    pool.query(
      `SELECT log_date::text, weight_kg, calories, workout_completed
       FROM daily_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - 13
       ORDER BY log_date DESC`,
      [userId]
    ),

    // Past 7 days — extended fields for activity and sleep stats.
    pool.query(
      `SELECT log_date::text, calories, workout_completed,
              sleep_hours, steps, distance_km, floors_climbed
       FROM daily_logs
       WHERE user_id = $1 AND log_date >= CURRENT_DATE - 6
       ORDER BY log_date DESC`,
      [userId]
    ),

    // Most recent non-null weight (any date).
    pool.query(
      `SELECT weight_kg FROM daily_logs
       WHERE user_id = $1 AND weight_kg IS NOT NULL
       ORDER BY log_date DESC LIMIT 1`,
      [userId]
    ),

    // Most recent plan — workout_plan for today's exercises, meal_plan for meals.
    pool.query(
      `SELECT workout_plan, meal_plan FROM plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    ),

    // Streak: recursive CTE counts consecutive logged days ending today.
    pool.query(
      `WITH RECURSIVE streak_cte AS (
         SELECT log_date FROM daily_logs
         WHERE user_id = $1 AND log_date = CURRENT_DATE
         UNION ALL
         SELECT dl.log_date FROM daily_logs dl
         JOIN streak_cte sc ON dl.log_date = sc.log_date - 1
         WHERE dl.user_id = $1
       )
       SELECT COUNT(*) AS streak FROM streak_cte`,
      [userId]
    ),

    // Today's log — steps, distance, sleep, workout checklist state.
    pool.query(
      `SELECT steps, distance_km, floors_climbed, sleep_hours,
              workout_log, meals_log, calories, workout_completed
       FROM daily_logs
       WHERE user_id = $1 AND log_date = CURRENT_DATE`,
      [userId]
    ),

    getProfileByUserId(userId),
  ]);

  // ── Derived metrics ─────────────────────────────────────────────────────────

  const workoutsThisWeek = last7Logs.filter((l) => l.workout_completed).length;

  const daysWithCalories = last7Logs.filter((l) => l.calories != null);
  const avgCaloriesThisWeek =
    daysWithCalories.length > 0
      ? Math.round(
          daysWithCalories.reduce((sum, l) => sum + Number(l.calories), 0) /
            daysWithCalories.length
        )
      : null;

  const currentWeight = weightRows[0]?.weight_kg
    ? parseFloat(weightRows[0].weight_kg)
    : null;

  const streak = parseInt(streakRows[0]?.streak ?? 0, 10);
  const weeklyPlanTotal = profile?.workout_days_per_week ?? 0;

  // ── Today's activity ────────────────────────────────────────────────────────

  const todayLog = todayLogRows[0] || null;
  const stepsToday   = todayLog?.steps       != null ? parseInt(todayLog.steps, 10)           : null;
  const distanceToday = todayLog?.distance_km != null ? parseFloat(todayLog.distance_km)       : null;

  // ── Sleep average — past 7 days ─────────────────────────────────────────────

  const daysWithSleep = last7Logs.filter((l) => l.sleep_hours != null);
  const sleepAvg =
    daysWithSleep.length > 0
      ? parseFloat(
          (daysWithSleep.reduce((sum, l) => sum + Number(l.sleep_hours), 0) /
            daysWithSleep.length).toFixed(1)
        )
      : null;

  // ── Average calories burned — past 7 days ──────────────────────────────────
  // Sources: workout (MET ≈ 5 for 1h mixed training), steps, floors.
  // Weight used for scaling; defaults to 70 kg if unknown.

  const weightForCalc = currentWeight ?? (profile?.weight_kg ? parseFloat(profile.weight_kg) : 70);
  const activeDaysForBurn = last7Logs.filter(
    (l) => l.workout_completed || l.steps != null || l.floors_climbed != null
  );
  let avgCaloriesBurned = null;
  if (activeDaysForBurn.length > 0) {
    const totalBurned = activeDaysForBurn.reduce((sum, l) => {
      let dayCal = 0;
      // Workout: rough 5 MET × 1 h × weight_kg / 60 × 60 min ≈ 5 × weight / 60 kcal/min × 60 min
      if (l.workout_completed) dayCal += Math.round(5 * weightForCalc * 1); // 5 MET × kg × hours
      if (l.steps)          dayCal += Number(l.steps) * 0.04 * (weightForCalc / 70);
      if (l.floors_climbed) dayCal += Number(l.floors_climbed) * 0.15 * (weightForCalc / 70);
      return sum + dayCal;
    }, 0);
    avgCaloriesBurned = Math.round(totalBurned / activeDaysForBurn.length);
  }

  // ── Steps goal ──────────────────────────────────────────────────────────────

  const stepsGoal = profile?.steps_goal ?? 10000;

  // ── Plans ───────────────────────────────────────────────────────────────────

  const rawMealPlan    = planRows[0]?.meal_plan;
  const rawWorkoutPlan = planRows[0]?.workout_plan;
  const mealPlan    = parseJsonField(rawMealPlan);
  const workoutPlan = parseJsonField(rawWorkoutPlan);
  const calorieTarget = mealPlan?.dailyCalorieTarget ?? null;

  // Today's workout (null = rest day)
  const todayDayName = DAYS_OF_WEEK[new Date().getDay()];
  const todayWorkout = workoutPlan?.[todayDayName] ?? null;

  // Today's planned meals
  const todayMeals = mealPlan
    ? {
        breakfast: mealPlan.breakfast ?? null,
        lunch:     mealPlan.lunch     ?? null,
        dinner:    mealPlan.dinner    ?? null,
        snack:     mealPlan.snack     ?? null,
        dailyCalorieTarget: mealPlan.dailyCalorieTarget ?? null,
      }
    : null;

  // Workout checklist state — JSON array of checked exercise names
  const todayWorkoutLog = (() => {
    const raw = todayLog?.workout_log;
    if (!raw) return [];
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
    catch { return []; }
  })();

  // ── Histories in ascending order for charts ─────────────────────────────────

  const weightHistory = last14Logs
    .filter((l) => l.weight_kg != null)
    .map((l) => ({ date: l.log_date, weight_kg: parseFloat(l.weight_kg) }))
    .reverse();

  const calorieHistory = last7Logs
    .filter((l) => l.calories != null)
    .map((l) => ({ date: l.log_date, calories: Number(l.calories) }))
    .reverse();

  const workoutHistory = last7Logs
    .map((l) => ({ date: l.log_date, completed: l.workout_completed }))
    .reverse();

  return res.status(200).json({
    // Existing fields (unchanged)
    workoutsThisWeek,
    avgCaloriesThisWeek,
    currentWeight,
    streak,
    calorieTarget,
    weightHistory,
    calorieHistory,
    workoutHistory,
    weeklyPlanTotal,
    // New Phase 4 fields
    stepsToday,
    distanceToday,
    sleepAvg,
    avgCaloriesBurned,
    stepsGoal,
    todayWorkout,
    todayMeals,
    todayWorkoutLog,
  });
}

module.exports = { getDashboardData };
