// Dashboard — overview page showing real aggregated health stats and charts.
// Fetches from GET /api/dashboard on mount; shows a loading skeleton while waiting.
// Phase 4: adds activity row, today's workout checklist, and today's meals card.

import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getDashboardData } from "../api/dashboard";
import { getProfile } from "../api/profile";
import { patchTodayLog } from "../api/logs";

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDisplayWeight(kg, unitPref) {
  if (kg == null) return null;
  return unitPref === "imperial" ? +(kg * 2.20462).toFixed(1) : +kg.toFixed(1);
}

// Format "2024-02-23" → "Feb 23" without timezone issues.
function formatDate(dateStr) {
  const [, monthStr, dayStr] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(monthStr, 10) - 1]} ${parseInt(dayStr, 10)}`;
}

function mealName(meal) {
  if (!meal) return null;
  if (typeof meal === "string") return meal;
  return meal.name || null;
}

function mealCalories(meal) {
  if (!meal || typeof meal === "string") return null;
  return meal.calories ?? null;
}

function mealIngredients(meal) {
  if (!meal || typeof meal === "string") return [];
  return Array.isArray(meal.ingredients) ? meal.ingredients : [];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }) {
  return <div className={`bg-gray-200 rounded-xl animate-pulse ${className}`} />;
}

function StatCard({ label, value, sub, progress }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {progress != null && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ActivityCard({ label, value, sub, progress, progressColor = "bg-emerald-500" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {progress != null && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
          <div
            className={`${progressColor} h-1.5 rounded-full transition-all`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData]                     = useState(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [unit, setUnit]                     = useState("metric");
  const [checkedExercises, setCheckedExercises] = useState(new Set());
  const [savingWorkout, setSavingWorkout]   = useState(false);

  // Track whether the user has interacted so we don't persist on initial load.
  const userInteracted = useRef(false);

  useEffect(() => {
    Promise.all([getDashboardData(), getProfile().catch(() => null)])
      .then(([dashData, profile]) => {
        setData(dashData);
        if (profile?.unit_preference) setUnit(profile.unit_preference);
        if (Array.isArray(dashData?.todayWorkoutLog)) {
          setCheckedExercises(new Set(dashData.todayWorkoutLog));
        }
      })
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, []);

  // Persist checklist whenever it changes (user-triggered only).
  useEffect(() => {
    if (!userInteracted.current) return;
    setSavingWorkout(true);
    patchTodayLog({ workout_log: JSON.stringify([...checkedExercises]) })
      .catch(() => {})
      .finally(() => setSavingWorkout(false));
  }, [checkedExercises]);

  const toggleExercise = useCallback((exerciseName) => {
    userInteracted.current = true;
    setCheckedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseName)) next.delete(exerciseName);
      else next.add(exerciseName);
      return next;
    });
  }, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        <SkeletonBox className="h-8 w-40 mb-6" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          {[...Array(4)].map((_, i) => <SkeletonBox key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <SkeletonBox key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {[...Array(2)].map((_, i) => <SkeletonBox key={i} className="h-52" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => <SkeletonBox key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  // ── Destructure data ──────────────────────────────────────────────────────
  const {
    workoutsThisWeek  = 0,
    avgCaloriesThisWeek = null,
    currentWeight     = null,
    streak            = 0,
    calorieTarget     = null,
    weightHistory     = [],
    calorieHistory    = [],
    workoutHistory    = [],
    weeklyPlanTotal   = 0,
    stepsToday        = null,
    distanceToday     = null,
    sleepAvg          = null,
    avgCaloriesBurned = null,
    stepsGoal         = 10000,
    todayWorkout      = null,
    todayMeals        = null,
  } = data ?? {};

  const weightUnit = unit === "imperial" ? "lbs" : "kg";

  const hasAnyData =
    weightHistory.length > 0 || calorieHistory.length > 0 || workoutsThisWeek > 0;

  // ── Derived values ────────────────────────────────────────────────────────

  const workoutPercent =
    weeklyPlanTotal > 0 ? Math.min((workoutsThisWeek / weeklyPlanTotal) * 100, 100) : 0;

  const stepsPercent =
    stepsGoal > 0 && stepsToday != null ? (stepsToday / stepsGoal) * 100 : null;

  const sleepEmoji =
    sleepAvg == null ? null : sleepAvg < 6 ? "😴" : sleepAvg < 7 ? "😐" : "😊";

  const todayExercises = todayWorkout?.exercises || [];
  const isRestDay = !todayWorkout;

  // ── Chart data ────────────────────────────────────────────────────────────

  const weightChartData = weightHistory.map((d) => ({
    date: formatDate(d.date),
    weight: toDisplayWeight(d.weight_kg, unit),
  }));

  const calorieChartData = calorieHistory.map((d) => ({
    date: formatDate(d.date),
    calories: d.calories,
  }));

  const weightValues = weightHistory.map((d) => toDisplayWeight(d.weight_kg, unit));
  const weightDomain = weightValues.length > 0
    ? [Math.floor(Math.min(...weightValues)) - 1, Math.ceil(Math.max(...weightValues)) + 1]
    : ["auto", "auto"];

  // ── Meal slots ────────────────────────────────────────────────────────────

  const MEAL_SLOTS = [
    { key: "breakfast", label: "Breakfast", emoji: "🌅" },
    { key: "lunch",     label: "Lunch",     emoji: "☀️" },
    { key: "dinner",    label: "Dinner",    emoji: "🌙" },
    { key: "snack",     label: "Snack",     emoji: "🍎" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* ── Row 1: Performance Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Workouts This Week"
          value={
            weeklyPlanTotal > 0
              ? `${workoutsThisWeek} / ${weeklyPlanTotal}`
              : `${workoutsThisWeek}`
          }
          sub={
            weeklyPlanTotal > 0
              ? `${Math.round(workoutPercent)}% of weekly goal`
              : "No plan set"
          }
          progress={workoutPercent}
        />
        <StatCard
          label="Avg Cal Burned / Day"
          value={avgCaloriesBurned != null ? `${avgCaloriesBurned.toLocaleString()} kcal` : "--"}
          sub="7-day active days avg"
        />
        <StatCard
          label="Current Weight"
          value={
            currentWeight != null
              ? `${toDisplayWeight(currentWeight, unit)} ${weightUnit}`
              : "--"
          }
          sub="Most recent logged"
        />
        <StatCard
          label="Day Streak"
          value={streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""} 🔥` : "0 days"}
          sub={streak > 0 ? "Keep it up!" : "Log today to start"}
        />
      </div>

      {/* ── Row 2: Activity Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <ActivityCard
          label="Steps Today"
          value={stepsToday != null ? stepsToday.toLocaleString() : "--"}
          sub={`Goal: ${stepsGoal.toLocaleString()}`}
          progress={stepsPercent}
          progressColor="bg-emerald-500"
        />
        <ActivityCard
          label="Distance Today"
          value={
            distanceToday != null
              ? unit === "imperial"
                ? `${(distanceToday * 0.621371).toFixed(2)} mi`
                : `${distanceToday.toFixed(2)} km`
              : "--"
          }
          sub="From today's log"
        />
        <ActivityCard
          label="Avg Daily Calories"
          value={
            avgCaloriesThisWeek != null
              ? `${avgCaloriesThisWeek.toLocaleString()} kcal`
              : "--"
          }
          sub="7-day average"
        />
        <ActivityCard
          label="Sleep Avg"
          value={
            sleepAvg != null
              ? `${sleepAvg}h ${sleepEmoji}`
              : "--"
          }
          sub="Past 7 days"
        />
      </div>

      {/* ── Row 3: Today's Workout + Today's Meals ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Today's Workout checklist */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Today's Workout
              {todayWorkout?.focus && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  — {todayWorkout.focus}
                </span>
              )}
            </h3>
            {savingWorkout && (
              <span className="text-xs text-gray-400 animate-pulse">Saving…</span>
            )}
          </div>

          {isRestDay ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">🛋️</p>
              <p className="text-sm font-medium text-gray-600">Rest Day</p>
              <p className="text-xs text-gray-400 mt-1">
                No workout scheduled — recover well.
              </p>
            </div>
          ) : todayExercises.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No exercises in today's plan.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {todayExercises.map((ex, idx) => {
                const isChecked = checkedExercises.has(ex.name);
                return (
                  <li key={idx}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleExercise(ex.name)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight transition-colors ${
                          isChecked ? "line-through text-gray-400" : "text-gray-800"
                        }`}>
                          {ex.name}
                        </p>
                        {(ex.sets || ex.reps || ex.weight) && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : ""}
                            {ex.weight
                              ? ` · ${unit === "imperial"
                                  ? `${(ex.weight * 2.20462).toFixed(1)} lbs`
                                  : `${ex.weight} kg`}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {!isRestDay && todayExercises.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {checkedExercises.size} / {todayExercises.length} completed
                {todayWorkout?.duration_minutes
                  ? ` · ~${todayWorkout.duration_minutes} min`
                  : ""}
              </p>
              {checkedExercises.size === todayExercises.length && todayExercises.length > 0 && (
                <span className="text-xs text-emerald-600 font-medium">✓ Done!</span>
              )}
            </div>
          )}

          {!todayWorkout && (
            <div className="mt-3">
              <Link
                to="/plan"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Generate a plan →
              </Link>
            </div>
          )}
        </div>

        {/* Today's Meals */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Today's Meals</h3>

          {!todayMeals ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-3">No meal plan for today.</p>
              <Link
                to="/plan"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Generate a plan →
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-3.5">
                {MEAL_SLOTS.map(({ key, label, emoji }) => {
                  const meal = todayMeals[key];
                  if (!meal) return null;
                  const name = mealName(meal) || label;
                  const cal  = mealCalories(meal);
                  const ings = mealIngredients(meal);
                  return (
                    <li key={key} className="flex items-start gap-2.5">
                      <span className="text-base leading-snug mt-0.5 shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                          {cal && (
                            <span className="text-xs text-gray-400 shrink-0">{cal} kcal</span>
                          )}
                        </div>
                        {ings.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {ings.slice(0, 3).join(", ")}
                            {ings.length > 3 ? "…" : ""}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {todayMeals.dailyCalorieTarget && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Daily target: {todayMeals.dailyCalorieTarget.toLocaleString()} kcal
                  </p>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Empty state (shown even if rows above are present, e.g. no log data yet) */}
      {!hasAnyData && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mb-6">
          <p className="text-gray-500 font-medium mb-2">
            No data yet — start logging to see your stats 📊
          </p>
          <p className="text-sm text-gray-400 mb-4">
            Your charts and streak will appear here once you log your first day.
          </p>
          <Link
            to="/log"
            className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Log Today →
          </Link>
        </div>
      )}

      {/* ── Charts (only render when there's data) ────────────────────── */}
      {hasAnyData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Weight Trend */}
          <ChartCard title={`Weight Trend — past 14 days (${weightUnit})`}>
            {weightChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={weightDomain} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    name={`Weight (${weightUnit})`}
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">
                Log your body weight to see this chart.
              </p>
            )}
          </ChartCard>

          {/* Daily Calories */}
          <ChartCard title="Daily Calories — past 7 days">
            {calorieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={calorieChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="calories" name="Calories" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  {calorieTarget && (
                    <ReferenceLine
                      y={calorieTarget}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{
                        value: `Target: ${calorieTarget}`,
                        position: "insideTopRight",
                        fontSize: 11,
                        fill: "#ef4444",
                      }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">
                Log your calories to see this chart.
              </p>
            )}
          </ChartCard>

          {/* Workout Completion */}
          <ChartCard title="Workout Completion This Week">
            <p className="text-sm text-gray-500 mb-3">
              {workoutsThisWeek} of {weeklyPlanTotal} workouts done this week
            </p>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${workoutPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {weeklyPlanTotal === 0
                ? "Generate a plan to set your weekly target."
                : `${Math.round(workoutPercent)}% complete`}
            </p>
          </ChartCard>

        </div>
      )}
    </div>
  );
}
