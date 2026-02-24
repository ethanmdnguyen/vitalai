// Dashboard controller — aggregates real log data into a single summary response.
// All date filtering happens in PostgreSQL (CURRENT_DATE) to avoid JS timezone issues.
// log_date is cast to ::text so it arrives as "YYYY-MM-DD" regardless of pg version.

const pool = require("../../db/pool");
const { getProfileByUserId } = require("../models/profile.model");

async function getDashboardData(req, res) {
  const userId = req.user.id;

  // Run all DB queries in parallel.
  const [
    { rows: last14Logs },
    { rows: last7Logs },
    { rows: weightRows },
    { rows: planRows },
    { rows: streakRows },
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

    // Past 7 days — used for weekly stats and calorie/workout charts.
    pool.query(
      `SELECT log_date::text, calories, workout_completed
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

    // Most recent plan — needed for calorie target reference line.
    pool.query(
      `SELECT meal_plan FROM plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
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

  const rawMealPlan = planRows[0]?.meal_plan;
  const mealPlan = rawMealPlan
    ? typeof rawMealPlan === "string"
      ? JSON.parse(rawMealPlan)
      : rawMealPlan
    : null;
  const calorieTarget = mealPlan?.dailyCalorieTarget ?? null;

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
    workoutsThisWeek,
    avgCaloriesThisWeek,
    currentWeight,
    streak,
    calorieTarget,
    weightHistory,
    calorieHistory,
    workoutHistory,
    weeklyPlanTotal,
  });
}

module.exports = { getDashboardData };
