// Plan page — displays the AI-generated weekly workout and meal plan.
// Fetches the existing plan on load; allows regeneration via a button.

import { useState, useEffect } from "react";
import { generatePlan, getCurrentPlan } from "../api/plans";
import Toast, { useToast } from "../components/Toast";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};
const MEALS = ["breakfast", "lunch", "dinner", "snack"];

export default function Plan() {
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    getCurrentPlan()
      .then((data) => setPlan(data))
      .catch(() => {}) // non-fatal — empty state shows
      .finally(() => setIsLoading(false));
  }, []);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const data = await generatePlan();
      setPlan(data);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to generate plan. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  const workoutPlan = plan?.workout_plan;
  const mealPlan = plan?.meal_plan;
  const notes = plan?.notes;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Plan</h1>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isLoading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
        >
          {isGenerating ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Gemini is creating your plan…
            </>
          ) : (
            plan ? "Regenerate Plan" : "Generate My Plan"
          )}
        </button>
      </div>

      <Toast toast={toast} />

      {isLoading && (
        <p className="text-gray-400 text-sm">Loading…</p>
      )}

      {!isLoading && !plan && !isGenerating && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-2 font-medium">
            No plan yet — click Generate My Plan to get started 🚀
          </p>
        </div>
      )}

      {plan && (
        <div className="space-y-10">

          {/* ── Workout Plan ── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Workout Plan</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 md:overflow-x-visible">
              {DAYS.map((day) => {
                const dayPlan = workoutPlan?.[day];
                return (
                  <div key={day} className="shrink-0 w-40 md:w-auto bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      {DAY_LABELS[day]}
                    </p>
                    {dayPlan ? (
                      <>
                        <p className="font-semibold text-gray-900 text-sm mb-1">{dayPlan.focus}</p>
                        <p className="text-xs text-blue-600 mb-3">{dayPlan.duration_minutes} min</p>
                        <ul className="space-y-2 flex-1">
                          {dayPlan.exercises.map((ex, i) => (
                            <li key={i} className="text-xs text-gray-600">
                              <span className="font-medium text-gray-800">{ex.name}</span>
                              <span className="text-gray-400"> {ex.sets}×{ex.reps}</span>
                              {ex.notes && (
                                <span className="block text-gray-400 mt-0.5 italic">{ex.notes}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-gray-400 text-sm mt-1">Rest Day 😴</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Meal Plan ── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Meal Plan</h2>

            {/* Calorie target + macro badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-medium">
                {mealPlan?.dailyCalorieTarget} kcal / day
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

            {/* Meal cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {MEALS.map((meal) => {
                const mealData = mealPlan?.[meal];
                return (
                  <div key={meal} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </p>
                    <p className="font-semibold text-gray-900 mb-1">{mealData?.name}</p>
                    <p className="text-sm text-blue-600 mb-3">{mealData?.calories} kcal</p>
                    <ul className="space-y-0.5">
                      {mealData?.ingredients?.map((ingredient, i) => (
                        <li key={i} className="text-sm text-gray-500">• {ingredient}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Coaching Notes ── */}
          {notes && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Coaching Notes</h2>
              <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-5">
                <p className="text-gray-700 leading-relaxed">{notes}</p>
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}
