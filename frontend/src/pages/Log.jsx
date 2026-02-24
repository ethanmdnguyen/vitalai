// Log page — daily health log form with today's targets from the AI plan on the left
// and the editable log form on the right. Pre-fills from today's existing log on load.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { saveLog, getTodayLog } from "../api/logs";
import { getCurrentPlan } from "../api/plans";
import Toast, { useToast } from "../components/Toast";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const ENERGY_LABELS = {
  1: { emoji: "😴", label: "Exhausted" },
  2: { emoji: "😕", label: "Low"       },
  3: { emoji: "😐", label: "Okay"      },
  4: { emoji: "🙂", label: "Good"      },
  5: { emoji: "💪", label: "Great"     },
};

const EMPTY_FORM = {
  workout_completed: false,
  calories:          "",
  protein_g:         "",
  carbs_g:           "",
  fat_g:             "",
  water_ml:          "",
  sleep_hours:       "",
  energy_level:      null,
  weight_kg:         "",
  notes:             "",
};

function toFormValues(log) {
  if (!log || Object.keys(log).length === 0) return EMPTY_FORM;
  return {
    workout_completed: log.workout_completed ?? false,
    calories:          log.calories          ?? "",
    protein_g:         log.protein_g         ?? "",
    carbs_g:           log.carbs_g           ?? "",
    fat_g:             log.fat_g             ?? "",
    water_ml:          log.water_ml          ?? "",
    sleep_hours:       log.sleep_hours       ?? "",
    energy_level:      log.energy_level      ?? null,
    weight_kg:         log.weight_kg         ?? "",
    notes:             log.notes             ?? "",
  };
}

export default function Log() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  const today = new Date();
  const todayFormatted = today.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const todayDayName = DAY_NAMES[today.getDay()];

  useEffect(() => {
    Promise.all([getTodayLog(), getCurrentPlan()])
      .then(([log, currentPlan]) => {
        setForm(toFormValues(log));
        setPlan(currentPlan);
      })
      .catch(() => {}) // non-fatal — form just stays empty
      .finally(() => setIsLoading(false));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await saveLog({
        ...form,
        calories:      form.calories      !== "" ? Number(form.calories)      : null,
        protein_g:     form.protein_g     !== "" ? Number(form.protein_g)     : null,
        carbs_g:       form.carbs_g       !== "" ? Number(form.carbs_g)       : null,
        fat_g:         form.fat_g         !== "" ? Number(form.fat_g)         : null,
        water_ml:      form.water_ml      !== "" ? Number(form.water_ml)      : null,
        sleep_hours:   form.sleep_hours   !== "" ? Number(form.sleep_hours)   : null,
        energy_level:  form.energy_level  !== null ? Number(form.energy_level) : null,
        weight_kg:     form.weight_kg     !== "" ? Number(form.weight_kg)     : null,
      });
      showToast("Logged! Keep it up 💪", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to save log. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const todayWorkout = plan?.workout_plan?.[todayDayName];
  const mealPlan = plan?.meal_plan;

  if (isLoading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{todayFormatted}</h1>

      <Toast toast={toast} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: Today's Targets ── */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Today's Targets</h2>

          {!plan ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-gray-500 mb-3 text-sm">No plan generated yet.</p>
              <Link to="/plan" className="text-blue-600 hover:underline text-sm font-medium">
                Generate a plan first →
              </Link>
            </div>
          ) : (
            <>
              {/* Workout target */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Today's Workout
                </p>
                {todayWorkout ? (
                  <>
                    <p className="font-semibold text-gray-900 mb-1">{todayWorkout.focus}</p>
                    <p className="text-sm text-blue-600 mb-3">{todayWorkout.duration_minutes} min</p>
                    <ul className="space-y-1.5">
                      {todayWorkout.exercises.map((ex, i) => (
                        <li key={i} className="text-sm text-gray-600">
                          <span className="font-medium text-gray-800">{ex.name}</span>
                          <span className="text-gray-400"> — {ex.sets}×{ex.reps}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">Rest Day 😴 — no workout scheduled.</p>
                )}
              </div>

              {/* Nutrition targets */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Nutrition Targets
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {mealPlan?.dailyCalorieTarget} kcal
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    Protein {mealPlan?.macros?.protein_g}g
                  </span>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    Carbs {mealPlan?.macros?.carbs_g}g
                  </span>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                    Fat {mealPlan?.macros?.fat_g}g
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right: Log Your Day ── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Log Your Day</h2>
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

            {/* Workout completed toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workout completed?
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, workout_completed: true }))}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                    form.workout_completed
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  Yes ✓
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, workout_completed: false }))}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                    !form.workout_completed
                      ? "bg-gray-400 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  No ✗
                </button>
              </div>
            </div>

            {/* Calories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calories eaten
              </label>
              <input
                type="number"
                name="calories"
                value={form.calories}
                onChange={handleChange}
                placeholder="e.g. 2100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Macros row */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Macros (g)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: "protein_g", placeholder: "Protein" },
                  { name: "carbs_g",   placeholder: "Carbs"   },
                  { name: "fat_g",     placeholder: "Fat"     },
                ].map(({ name, placeholder }) => (
                  <input
                    key={name}
                    type="number"
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ))}
              </div>
            </div>

            {/* Water */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Water (ml)
                <span className="text-gray-400 font-normal ml-1">— 2000ml ≈ 8 glasses</span>
              </label>
              <input
                type="number"
                name="water_ml"
                value={form.water_ml}
                onChange={handleChange}
                placeholder="e.g. 2000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sleep */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sleep hours last night
              </label>
              <input
                type="number"
                name="sleep_hours"
                value={form.sleep_hours}
                onChange={handleChange}
                min="0"
                max="24"
                step="0.5"
                placeholder="e.g. 7.5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Energy level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Energy level</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, energy_level: level }))}
                    className={`flex-1 flex flex-col items-center py-2 rounded-lg border text-xs transition-colors ${
                      form.energy_level === level
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-500"
                    }`}
                  >
                    <span className="text-lg">{ENERGY_LABELS[level].emoji}</span>
                    <span className="mt-0.5">{ENERGY_LABELS[level].label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body weight (kg)
                <span className="text-gray-400 font-normal ml-1">— optional</span>
              </label>
              <input
                type="number"
                name="weight_kg"
                value={form.weight_kg}
                onChange={handleChange}
                step="0.1"
                placeholder="e.g. 74.5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                placeholder="How did today feel?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Saving…" : "Save Today's Log"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
