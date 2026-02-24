// Dashboard — overview page showing real aggregated health stats and charts.
// Fetches from GET /api/dashboard on mount; shows a loading skeleton while waiting.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getDashboardData } from "../api/dashboard";

// Format "2024-02-23" → "Feb 23" without timezone issues.
function formatDate(dateStr) {
  const [, monthStr, dayStr] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(monthStr, 10) - 1]} ${parseInt(dayStr, 10)}`;
}

function SkeletonBox({ className = "" }) {
  return (
    <div className={`bg-gray-200 rounded-xl animate-pulse ${className}`} />
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDashboardData()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        <SkeletonBox className="h-8 w-40 mb-6" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonBox key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => <SkeletonBox key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const {
    workoutsThisWeek = 0,
    avgCaloriesThisWeek = null,
    currentWeight = null,
    streak = 0,
    calorieTarget = null,
    weightHistory = [],
    calorieHistory = [],
    workoutHistory = [],
    weeklyPlanTotal = 0,
  } = data ?? {};

  const hasAnyData =
    weightHistory.length > 0 || calorieHistory.length > 0 || workoutsThisWeek > 0;

  const workoutPercent =
    weeklyPlanTotal > 0 ? Math.min((workoutsThisWeek / weeklyPlanTotal) * 100, 100) : 0;

  // ── Format stat card values ───────────────────────────────────────────────
  const statCards = [
    {
      label: "Workouts This Week",
      value: weeklyPlanTotal > 0
        ? `${workoutsThisWeek} of ${weeklyPlanTotal} planned`
        : `${workoutsThisWeek}`,
    },
    {
      label: "Avg Daily Calories",
      value: avgCaloriesThisWeek != null
        ? `${avgCaloriesThisWeek.toLocaleString()} kcal`
        : "--",
    },
    {
      label: "Current Weight",
      value: currentWeight != null ? `${currentWeight} kg` : "--",
    },
    {
      label: "Day Streak",
      value: streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""} 🔥` : "0 days",
    },
  ];

  // ── Prepare chart data with formatted labels ──────────────────────────────
  const weightChartData = weightHistory.map((d) => ({
    date: formatDate(d.date),
    weight_kg: d.weight_kg,
  }));

  const calorieChartData = calorieHistory.map((d) => ({
    date: formatDate(d.date),
    calories: d.calories,
  }));

  const weightValues = weightHistory.map((d) => d.weight_kg);
  const weightDomain = weightValues.length > 0
    ? [Math.floor(Math.min(...weightValues)) - 1, Math.ceil(Math.max(...weightValues)) + 1]
    : ["auto", "auto"];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Empty state */}
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

      {/* Charts (only render when there's something to show) */}
      {hasAnyData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Weight Trend */}
          <ChartCard title="Weight Trend — past 14 days (kg)">
            {weightChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={weightDomain} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="weight_kg"
                    name="Weight (kg)"
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
