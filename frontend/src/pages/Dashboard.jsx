// Dashboard — overview page with stat cards and placeholder charts.
// Uses static dummy data until real log data is wired up in a later milestone.

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const WEIGHT_DATA = [
  { date: "Mon", weight: 75.2 },
  { date: "Tue", weight: 74.8 },
  { date: "Wed", weight: 75.5 },
  { date: "Thu", weight: 74.9 },
  { date: "Fri", weight: 75.1 },
  { date: "Sat", weight: 74.7 },
  { date: "Sun", weight: 74.5 },
];

const CALORIE_DATA = [
  { date: "Mon", calories: 2100 },
  { date: "Tue", calories: 1950 },
  { date: "Wed", calories: 2200 },
  { date: "Thu", calories: 1800 },
  { date: "Fri", calories: 2050 },
  { date: "Sat", calories: 2300 },
  { date: "Sun", calories: 1900 },
];

const STAT_CARDS = [
  { label: "Workouts This Week", value: "0" },
  { label: "Avg Daily Calories",  value: "--" },
  { label: "Current Weight",      value: "--" },
  { label: "Day Streak",          value: "0"  },
];

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
  const workoutsCompleted = 0;
  const workoutsTotal = 0;
  const workoutPercent = workoutsTotal > 0 ? (workoutsCompleted / workoutsTotal) * 100 : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Weight Trend */}
        <ChartCard title="Weight Trend (kg)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={WEIGHT_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[74, 76]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Daily Calories */}
        <ChartCard title="Daily Calories">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CALORIE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="calories" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Workout Completion */}
        <ChartCard title="Workout Completion This Week">
          <p className="text-sm text-gray-500 mb-3">
            {workoutsCompleted} of {workoutsTotal} workouts done this week
          </p>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${workoutPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {workoutsTotal === 0 ? "Log your first workout to get started." : `${Math.round(workoutPercent)}% complete`}
          </p>
        </ChartCard>

      </div>
    </div>
  );
}
