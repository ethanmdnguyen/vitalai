// Log page — enhanced daily health log with per-meal tracking and workout detail.
// Meals are logged meal-by-meal with totals computed automatically.
// Workout details (exercises completed / skip reason) saved as JSON to workout_log column.

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { saveLog, getTodayLog } from "../api/logs";
import { getCurrentPlan } from "../api/plans";
import { getMyMeals } from "../api/meals";
import Toast, { useToast } from "../components/Toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const ENERGY_LABELS = {
  1: { emoji: "😴", label: "Exhausted" },
  2: { emoji: "😕", label: "Low"       },
  3: { emoji: "😐", label: "Okay"      },
  4: { emoji: "🙂", label: "Good"      },
  5: { emoji: "💪", label: "Great"     },
};

const MEAL_INFO = {
  breakfast: { label: "Breakfast", icon: "🌅" },
  lunch:     { label: "Lunch",     icon: "☀️" },
  dinner:    { label: "Dinner",    icon: "🌆" },
  snack:     { label: "Snack",     icon: "🍎" },
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const SKIP_REASONS = ["Rest day", "Injury", "Low energy", "Too busy", "Other"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Rough calorie estimate from macros when calories aren't stored separately.
function calFromMacros(p = 0, c = 0, f = 0) {
  return Math.round(p * 4 + c * 4 + f * 9);
}

// ── WorkoutSection ────────────────────────────────────────────────────────────

function WorkoutSection({
  workoutCompleted, onSetCompleted,
  todayWorkout,
  completedExIds, onToggleEx,
  extraExercises, onAddExtra, onRemoveExtra,
  skipReason, onSkipReason,
}) {
  const [expanded, setExpanded] = useState(false);
  const [exInput, setExInput] = useState({ name: "", sets: "", reps: "" });

  function handleSetCompleted(value) {
    onSetCompleted(value);
    setExpanded(true);
  }

  function handleAddExtra() {
    if (!exInput.name.trim()) return;
    onAddExtra({ name: exInput.name.trim(), sets: exInput.sets || "3", reps: exInput.reps || "10" });
    setExInput({ name: "", sets: "", reps: "" });
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Workout completed?</label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleSetCompleted(true)}
          className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
            workoutCompleted === true
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Yes ✓
        </button>
        <button
          type="button"
          onClick={() => handleSetCompleted(false)}
          className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
            workoutCompleted === false
              ? "bg-red-500 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          No ✗
        </button>
      </div>

      {workoutCompleted !== null && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
          >
            <span>{workoutCompleted ? "What did you do?" : "Why did you skip?"}</span>
            <span className="text-gray-400 text-xs">{expanded ? "▲" : "▼"}</span>
          </button>

          {expanded && (
            <div className="p-4 space-y-3 bg-white">
              {workoutCompleted ? (
                <>
                  {todayWorkout?.exercises?.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Planned Exercises
                      </p>
                      {todayWorkout.exercises.map((ex, i) => (
                        <label key={i} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={completedExIds.has(i)}
                            onChange={() => onToggleEx(i)}
                            className="w-4 h-4 rounded accent-green-500"
                          />
                          <span className={`text-sm flex-1 ${completedExIds.has(i) ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {ex.name}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">{ex.sets}×{ex.reps}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      No workout scheduled today — log your custom session below.
                    </p>
                  )}

                  {extraExercises.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Extra Exercises</p>
                      {extraExercises.map((ex, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="flex-1">{ex.name}</span>
                          <span className="text-xs text-gray-400">{ex.sets}×{ex.reps}</span>
                          <button
                            type="button"
                            onClick={() => onRemoveExtra(i)}
                            className="text-gray-300 hover:text-red-400 transition-colors text-xs px-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={exInput.name}
                      onChange={(e) => setExInput((p) => ({ ...p, name: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddExtra(); } }}
                      placeholder="Exercise name"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={exInput.sets}
                      onChange={(e) => setExInput((p) => ({ ...p, sets: e.target.value }))}
                      placeholder="Sets"
                      className="w-14 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={exInput.reps}
                      onChange={(e) => setExInput((p) => ({ ...p, reps: e.target.value }))}
                      placeholder="Reps"
                      className="w-14 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddExtra}
                      disabled={!exInput.name.trim()}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Why did you skip?
                  </label>
                  <select
                    value={skipReason}
                    onChange={(e) => onSkipReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select reason…</option>
                    {SKIP_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MealEntryCard ─────────────────────────────────────────────────────────────

function MealEntryCard({ entry, onRemove }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 rounded-xl">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{entry.name}</p>
        <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-gray-500">
          <span className="text-blue-600 font-medium">{entry.calories} kcal</span>
          {entry.protein_g > 0 && <span>P: {entry.protein_g}g</span>}
          {entry.carbs_g > 0 && <span>C: {entry.carbs_g}g</span>}
          {entry.fat_g > 0 && <span>F: {entry.fat_g}g</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-300 hover:text-red-400 transition-colors text-sm px-1 mt-0.5 shrink-0"
        title="Remove"
      >
        🗑️
      </button>
    </div>
  );
}

// ── AddMealModal ──────────────────────────────────────────────────────────────

function AddMealModal({ mealType, planMeal, savedMeals, onClose, onAdd }) {
  const [tab, setTab] = useState(planMeal ? "from_plan" : "custom");
  const [search, setSearch] = useState("");
  const [customMode, setCustomMode] = useState("by_meal");
  const [customForm, setCustomForm] = useState({ name: "", calories: "", protein_g: "", carbs_g: "", fat_g: "" });
  const [ingredients, setIngredients] = useState([]);
  const [ingInput, setIngInput] = useState({ name: "", quantity: "", calories: "" });

  const { label, icon } = MEAL_INFO[mealType];

  const filteredMeals = useMemo(
    () => savedMeals.filter((m) =>
      !search || m.name.toLowerCase().includes(search.toLowerCase())
    ),
    [savedMeals, search]
  );

  const ingredientTotal = ingredients.reduce((s, i) => s + (i.calories || 0), 0);

  function handleLogPlanMeal() {
    if (!planMeal) return;
    onAdd({
      id: makeId(),
      name: planMeal.name,
      calories: planMeal.calories || 0,
      protein_g: planMeal.macros?.protein_g || 0,
      carbs_g: planMeal.macros?.carbs_g || 0,
      fat_g: planMeal.macros?.fat_g || 0,
    });
  }

  function handleLogSavedMeal(meal) {
    const m = meal.macros || {};
    onAdd({
      id: makeId(),
      name: meal.name,
      calories: calFromMacros(m.protein_g, m.carbs_g, m.fat_g),
      protein_g: m.protein_g || 0,
      carbs_g: m.carbs_g || 0,
      fat_g: m.fat_g || 0,
    });
  }

  function handleAddCustomMeal() {
    if (!customForm.name.trim()) return;
    onAdd({
      id: makeId(),
      name: customForm.name.trim(),
      calories: parseInt(customForm.calories) || 0,
      protein_g: parseInt(customForm.protein_g) || 0,
      carbs_g: parseInt(customForm.carbs_g) || 0,
      fat_g: parseInt(customForm.fat_g) || 0,
    });
  }

  function handleAddIngredient() {
    if (!ingInput.name.trim()) return;
    setIngredients((prev) => [...prev, {
      name: ingInput.name.trim(),
      quantity: ingInput.quantity,
      calories: parseInt(ingInput.calories) || 0,
    }]);
    setIngInput({ name: "", quantity: "", calories: "" });
  }

  function handleLogIngredients() {
    if (!ingredients.length) return;
    onAdd({
      id: makeId(),
      name: ingredients.map((i) => i.name).join(", "),
      calories: ingredientTotal,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-gray-900">{icon} Add {label}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: "from_plan", label: "From Plan" },
            { key: "my_meals",  label: "My Meals"  },
            { key: "custom",    label: "Custom"    },
          ].map(({ key, label: tl }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tl}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── From Plan ── */}
          {tab === "from_plan" && (
            <div>
              {planMeal ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="font-semibold text-gray-900">{planMeal.name}</p>
                    <p className="text-sm text-blue-600 mt-1">{planMeal.calories} kcal</p>
                    <ul className="mt-2 space-y-0.5">
                      {planMeal.ingredients?.map((ing, i) => (
                        <li key={i} className="text-xs text-gray-500">• {ing}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={handleLogPlanMeal}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Log This Meal
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">
                  No {label.toLowerCase()} in your current plan.
                </p>
              )}
            </div>
          )}

          {/* ── My Meals ── */}
          {tab === "my_meals" && (
            <div className="space-y-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your saved meals…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {filteredMeals.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {savedMeals.length === 0 ? "No saved meals yet." : "No matches found."}
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredMeals.map((meal) => {
                    const m = meal.macros || {};
                    const cals = calFromMacros(m.protein_g, m.carbs_g, m.fat_g);
                    return (
                      <button
                        key={meal.id}
                        onClick={() => handleLogSavedMeal(meal)}
                        className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <p className="font-medium text-gray-900 text-sm">{meal.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cals > 0 ? `~${cals} kcal · ` : ""}{MEAL_INFO[meal.meal_type]?.label || meal.meal_type || ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Custom Entry ── */}
          {tab === "custom" && (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {[["by_meal", "By Meal"], ["by_ingredient", "By Ingredient"]].map(([key, tl]) => (
                  <button
                    key={key}
                    onClick={() => setCustomMode(key)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      customMode === key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {tl}
                  </button>
                ))}
              </div>

              {customMode === "by_meal" ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={customForm.name}
                    onChange={(e) => setCustomForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Meal name *"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={customForm.calories}
                    onChange={(e) => setCustomForm((p) => ({ ...p, calories: e.target.value }))}
                    placeholder="Calories"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {[["protein_g", "Protein (g)"], ["carbs_g", "Carbs (g)"], ["fat_g", "Fat (g)"]].map(([k, pl]) => (
                      <input
                        key={k}
                        type="number"
                        value={customForm[k]}
                        onChange={(e) => setCustomForm((p) => ({ ...p, [k]: e.target.value }))}
                        placeholder={pl}
                        className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleAddCustomMeal}
                    disabled={!customForm.name.trim()}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Add Meal
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ingInput.name}
                      onChange={(e) => setIngInput((p) => ({ ...p, name: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddIngredient(); } }}
                      placeholder="Ingredient"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={ingInput.quantity}
                      onChange={(e) => setIngInput((p) => ({ ...p, quantity: e.target.value }))}
                      placeholder="Qty"
                      className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={ingInput.calories}
                      onChange={(e) => setIngInput((p) => ({ ...p, calories: e.target.value }))}
                      placeholder="kcal"
                      className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleAddIngredient}
                      disabled={!ingInput.name.trim()}
                      className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-40 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {ingredients.length > 0 && (
                    <div className="space-y-1">
                      {ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="flex-1">{ing.name}{ing.quantity ? ` (${ing.quantity})` : ""}</span>
                          <span className="text-xs text-blue-600">{ing.calories} kcal</span>
                          <button
                            onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))}
                            className="text-gray-300 hover:text-red-400 text-xs px-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-500">Total</span>
                        <span className="text-sm font-semibold text-blue-600">{ingredientTotal} kcal</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleLogIngredients}
                    disabled={!ingredients.length}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Log All Ingredients
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MealAccordionSection ──────────────────────────────────────────────────────

function MealAccordionSection({ mealType, entries, planMeal, savedMeals, onAddEntry, onRemoveEntry }) {
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { label, icon } = MEAL_INFO[mealType];

  const sectionCalories = entries.reduce((s, e) => s + (e.calories || 0), 0);

  return (
    <>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {/* Accordion header */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors text-left"
        >
          <span className="text-lg">{icon}</span>
          <span className="flex-1 font-medium text-gray-800 text-sm">{label}</span>
          {entries.length > 0 && (
            <span className="text-sm font-semibold text-blue-600">{sectionCalories} kcal</span>
          )}
          <span className="text-gray-400 text-xs ml-1">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="border-t border-gray-100 bg-white">
            {entries.length > 0 && (
              <div className="p-3 space-y-2">
                {entries.map((entry) => (
                  <MealEntryCard
                    key={entry.id}
                    entry={entry}
                    onRemove={() => onRemoveEntry(mealType, entry.id)}
                  />
                ))}
              </div>
            )}

            {entries.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Nothing logged yet.</p>
            )}

            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-blue-500 hover:bg-blue-50 hover:border-blue-300 transition-colors font-medium"
              >
                + Add Entry
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddMealModal
          mealType={mealType}
          planMeal={planMeal}
          savedMeals={savedMeals}
          onClose={() => setShowModal(false)}
          onAdd={(entry) => {
            onAddEntry(mealType, entry);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

// ── MealTotalsBar ─────────────────────────────────────────────────────────────

function MealTotalsBar({ totals, calorieTarget, macroTargets }) {
  const calPct = calorieTarget > 0 ? Math.min((totals.calories / calorieTarget) * 100, 100) : 0;
  const isOver = calorieTarget > 0 && totals.calories > calorieTarget;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 mb-4">
      {/* Calorie progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5 text-sm">
          <span className="font-medium text-gray-700">Calories</span>
          <span className={`font-semibold ${isOver ? "text-red-500" : "text-gray-800"}`}>
            {totals.calories.toLocaleString()}
            {calorieTarget > 0 && ` / ${calorieTarget.toLocaleString()} kcal`}
          </span>
        </div>
        {calorieTarget > 0 && (
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${isOver ? "bg-red-500" : "bg-blue-500"}`}
              style={{ width: `${calPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Macro row */}
      <div className="flex gap-4 text-xs">
        {[
          ["Protein", totals.protein_g, macroTargets?.protein_g, "text-blue-600"],
          ["Carbs",   totals.carbs_g,   macroTargets?.carbs_g,   "text-green-600"],
          ["Fat",     totals.fat_g,     macroTargets?.fat_g,     "text-orange-500"],
        ].map(([label, val, target, color]) => (
          <div key={label} className="flex-1 text-center">
            <p className={`font-semibold ${color}`}>
              {val}g{target ? ` / ${target}g` : ""}
            </p>
            <p className="text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Log() {
  // Core form fields.
  const [form, setForm] = useState({ water_ml: "", sleep_hours: "", energy_level: null, weight_kg: "", notes: "" });

  // Workout detail.
  const [workoutCompleted, setWorkoutCompleted] = useState(null);
  const [completedExIds, setCompletedExIds] = useState(new Set());
  const [extraExercises, setExtraExercises] = useState([]);
  const [skipReason, setSkipReason] = useState("");

  // Meal entries by type.
  const [mealEntries, setMealEntries] = useState({ breakfast: [], lunch: [], dinner: [], snack: [] });

  // Saved meals for the My Meals tab (loaded once on mount).
  const [savedMeals, setSavedMeals] = useState([]);

  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  const today = new Date();
  const todayFormatted = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const todayDayName = DAY_NAMES[today.getDay()];

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      getTodayLog(),
      getCurrentPlan().catch(() => null),
      getMyMeals().catch(() => []),
    ])
      .then(([log, planData, meals]) => {
        setPlan(planData);
        setSavedMeals(meals);

        // Core fields
        setForm({
          water_ml:     log?.water_ml     ?? "",
          sleep_hours:  log?.sleep_hours  ?? "",
          energy_level: log?.energy_level ?? null,
          weight_kg:    log?.weight_kg    ?? "",
          notes:        log?.notes        ?? "",
        });

        // Workout
        if (log?.workout_completed !== undefined) {
          setWorkoutCompleted(log.workout_completed);
        }
        if (log?.workout_log) {
          try {
            const wl = JSON.parse(log.workout_log);
            setCompletedExIds(new Set(wl.completedExIds || []));
            setExtraExercises(wl.extraExercises || []);
            setSkipReason(wl.skipReason || "");
          } catch { /* ignore malformed */ }
        }

        // Meal entries
        if (log?.meals_log) {
          try {
            const ml = JSON.parse(log.meals_log);
            setMealEntries({
              breakfast: ml.breakfast || [],
              lunch:     ml.lunch     || [],
              dinner:    ml.dinner    || [],
              snack:     ml.snack     || [],
            });
          } catch { /* ignore malformed */ }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // ── Derived totals ────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    const all = Object.values(mealEntries).flat();
    return all.reduce(
      (acc, e) => ({
        calories:  acc.calories  + (e.calories  || 0),
        protein_g: acc.protein_g + (e.protein_g || 0),
        carbs_g:   acc.carbs_g   + (e.carbs_g   || 0),
        fat_g:     acc.fat_g     + (e.fat_g     || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
  }, [mealEntries]);

  // ── Meal mutations ────────────────────────────────────────────────────────

  function addMealEntry(mealType, entry) {
    setMealEntries((prev) => ({ ...prev, [mealType]: [...prev[mealType], entry] }));
  }

  function removeMealEntry(mealType, id) {
    setMealEntries((prev) => ({
      ...prev,
      [mealType]: prev[mealType].filter((e) => e.id !== id),
    }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);

    const workoutLogData = {
      completedExIds: [...completedExIds],
      extraExercises,
      skipReason,
    };

    try {
      await saveLog({
        workout_completed: workoutCompleted ?? false,
        calories:    totals.calories  || null,
        protein_g:   totals.protein_g || null,
        carbs_g:     totals.carbs_g   || null,
        fat_g:       totals.fat_g     || null,
        water_ml:    form.water_ml    !== "" ? Number(form.water_ml)    : null,
        sleep_hours: form.sleep_hours !== "" ? Number(form.sleep_hours) : null,
        energy_level: form.energy_level !== null ? Number(form.energy_level) : null,
        weight_kg:   form.weight_kg   !== "" ? Number(form.weight_kg)   : null,
        notes:       form.notes || null,
        meals_log:   JSON.stringify(mealEntries),
        workout_log: JSON.stringify(workoutLogData),
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
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Workout section */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <WorkoutSection
                workoutCompleted={workoutCompleted}
                onSetCompleted={setWorkoutCompleted}
                todayWorkout={todayWorkout}
                completedExIds={completedExIds}
                onToggleEx={(i) => setCompletedExIds((prev) => {
                  const next = new Set(prev);
                  next.has(i) ? next.delete(i) : next.add(i);
                  return next;
                })}
                extraExercises={extraExercises}
                onAddExtra={(ex) => setExtraExercises((prev) => [...prev, ex])}
                onRemoveExtra={(i) => setExtraExercises((prev) => prev.filter((_, j) => j !== i))}
                skipReason={skipReason}
                onSkipReason={setSkipReason}
              />
            </div>

            {/* Meal logging */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Meals</h3>

              <MealTotalsBar
                totals={totals}
                calorieTarget={mealPlan?.dailyCalorieTarget || 0}
                macroTargets={mealPlan?.macros}
              />

              <div className="space-y-2">
                {MEAL_TYPES.map((mt) => (
                  <MealAccordionSection
                    key={mt}
                    mealType={mt}
                    entries={mealEntries[mt]}
                    planMeal={mealPlan?.[mt]}
                    savedMeals={savedMeals}
                    onAddEntry={addMealEntry}
                    onRemoveEntry={removeMealEntry}
                  />
                ))}
              </div>
            </div>

            {/* Water */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Water (ml)
                <span className="text-gray-400 font-normal ml-1">— 2000ml ≈ 8 glasses</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  name="water_ml"
                  value={form.water_ml}
                  onChange={(e) => setForm((p) => ({ ...p, water_ml: e.target.value }))}
                  placeholder="e.g. 2000"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, water_ml: String((parseInt(p.water_ml) || 0) + 250) }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  +250ml
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, water_ml: String((parseInt(p.water_ml) || 0) + 500) }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  +500ml
                </button>
              </div>
            </div>

            {/* Sleep */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sleep hours last night
              </label>
              <input
                type="number"
                name="sleep_hours"
                value={form.sleep_hours}
                onChange={(e) => setForm((p) => ({ ...p, sleep_hours: e.target.value }))}
                min="0" max="24" step="0.5"
                placeholder="e.g. 7.5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Energy level */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
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
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body weight (kg)
                <span className="text-gray-400 font-normal ml-1">— optional</span>
              </label>
              <input
                type="number"
                name="weight_kg"
                value={form.weight_kg}
                onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))}
                step="0.1"
                placeholder="e.g. 74.5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
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
