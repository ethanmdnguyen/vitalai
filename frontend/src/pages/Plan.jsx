// Plan page — interactive AI workout plan with drag-and-drop, inline editing,
// exercise swap/add via Gemini, calorie estimates, and muscle group breakdown.
// Meal plan section is display-only (unchanged from v1).

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { generatePlan, getCurrentPlan, patchWorkoutPlan, swapExercise } from "../api/plans";
import { getProfile } from "../api/profile";
import Toast, { useToast } from "../components/Toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};
const MEALS = ["breakfast", "lunch", "dinner", "snack"];

const MET = { hiit: 10, running: 9, swimming: 8, cycling: 7, weightlifting: 5, yoga: 3, pilates: 3 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMet(focus = "") {
  const f = focus.toLowerCase();
  if (f.includes("hiit") || f.includes("interval")) return MET.hiit;
  if (f.includes("run") || f.includes("cardio")) return MET.running;
  if (f.includes("swim")) return MET.swimming;
  if (f.includes("cycl") || f.includes("bike")) return MET.cycling;
  if (f.includes("yoga")) return MET.yoga;
  if (f.includes("pilates")) return MET.pilates;
  return MET.weightlifting;
}

function estCalories(focus, durationMin, weightKg) {
  if (!durationMin || !weightKg) return null;
  return Math.round(getMet(focus) * weightKg * (durationMin / 60));
}

function getMuscleBreakdown(wp) {
  const counts = {};
  Object.values(wp || {}).forEach((day) => {
    if (!day) return;
    (day.exercises || []).forEach((ex) => {
      const muscles = Array.isArray(ex.primary_muscles)
        ? ex.primary_muscles
        : ex.primary_muscles
        ? [ex.primary_muscles]
        : [];
      muscles.forEach((m) => {
        const key = m.toLowerCase().trim();
        counts[key] = (counts[key] || 0) + 1;
      });
    });
  });
  return counts;
}

// ── EditableCell ──────────────────────────────────────────────────────────────

function EditableCell({ value, onSave, type = "text", placeholder, className = "" }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value ?? ""));

  useEffect(() => { setVal(String(value ?? "")); }, [value]);

  function commit() {
    setEditing(false);
    onSave(val);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditing(false); setVal(String(value ?? "")); }
        }}
        className={`border-b border-blue-400 bg-transparent focus:outline-none text-xs w-full ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={`cursor-pointer hover:text-blue-600 hover:underline decoration-dashed ${className}`}
    >
      {value || placeholder || "—"}
    </span>
  );
}

// ── ExerciseRow ───────────────────────────────────────────────────────────────

function ExerciseRow({ exercise, unit, onUpdate, onSwap, onRemove }) {
  const weightValue =
    exercise.weight != null
      ? unit === "imperial"
        ? `${(exercise.weight * 2.20462).toFixed(1)} lbs`
        : `${exercise.weight} kg`
      : "bodyweight";

  function saveWeight(raw) {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed || trimmed === "bodyweight" || trimmed === "bw") {
      onUpdate("weight", null);
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        onUpdate("weight", unit === "imperial" ? +(num / 2.20462).toFixed(2) : num);
      }
    }
  }

  return (
    <div className="mb-1.5 p-2 bg-gray-50 rounded-lg group">
      {/* Exercise name */}
      <EditableCell
        value={exercise.name}
        onSave={(v) => onUpdate("name", v)}
        className="font-medium text-gray-800 text-xs block"
      />

      {/* Sets × Reps · Weight */}
      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500 flex-wrap">
        <EditableCell
          value={String(exercise.sets ?? "")}
          onSave={(v) => onUpdate("sets", parseInt(v) || exercise.sets)}
          type="number"
          className="w-6 text-center"
        />
        <span>×</span>
        <EditableCell
          value={exercise.reps}
          onSave={(v) => onUpdate("reps", v)}
          className="w-12"
        />
        <span className="text-gray-300">·</span>
        <EditableCell
          value={weightValue}
          onSave={saveWeight}
          placeholder="bodyweight"
          className="w-20"
        />
      </div>

      {/* Muscle badges */}
      {(exercise.primary_muscles?.length > 0 || exercise.secondary_muscles?.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-1">
          {(exercise.primary_muscles || []).map((m) => (
            <span key={m} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs capitalize">{m}</span>
          ))}
          {(exercise.secondary_muscles || []).map((m) => (
            <span key={m} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs capitalize">{m}</span>
          ))}
        </div>
      )}

      {/* Notes */}
      {exercise.notes && (
        <p className="text-xs text-gray-400 italic mt-0.5 leading-tight">{exercise.notes}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onSwap} title="Swap exercise" className="text-xs text-gray-400 hover:text-blue-500">🔄</button>
        <button onClick={onRemove} title="Remove exercise" className="text-xs text-gray-400 hover:text-red-500">🗑️</button>
      </div>
    </div>
  );
}

// ── AddButton ─────────────────────────────────────────────────────────────────

function AddButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-center text-gray-300 hover:text-blue-400 text-xs py-0.5 hover:bg-blue-50 rounded transition-colors"
      title="Add exercise here"
    >
      ➕
    </button>
  );
}

// ── SwapModal ─────────────────────────────────────────────────────────────────

function SwapModal({ mode, exercise, workoutFocus, profileWeight, onClose, onSelect }) {
  const [alts, setAlts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customText, setCustomText] = useState("");
  const [chosen, setChosen] = useState(null);

  useEffect(() => {
    if (mode === "swap" && exercise?.name) fetchAlts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAlts(useCustom = false) {
    setLoading(true);
    setAlts([]);
    setChosen(null);
    try {
      const data = await swapExercise({
        exerciseName: useCustom ? null : exercise?.name,
        primaryMuscle: exercise?.primary_muscles?.[0] || workoutFocus,
        userWeightKg: profileWeight,
        customRequest: useCustom ? customText : undefined,
      });
      setAlts(data.alternatives || []);
    } catch {
      // silent fail — user can try custom
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-gray-900">
              {mode === "swap" ? `Swap: ${exercise?.name}` : `Add Exercise`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{workoutFocus}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Loading spinner */}
          {loading && (
            <div className="flex justify-center py-6">
              <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Alternative cards */}
          {!loading && alts.length > 0 && (
            <div className="space-y-2">
              {alts.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => setChosen(alt)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                    chosen === alt
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <p className="font-semibold text-gray-900 text-sm">{alt.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {alt.sets} sets × {alt.reps}
                  </p>
                  {alt.primary_muscles?.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">{alt.primary_muscles.join(", ")}</p>
                  )}
                  {alt.notes && (
                    <p className="text-xs text-gray-400 italic mt-0.5">{alt.notes}</p>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Custom request */}
          <div className={alts.length > 0 ? "border-t pt-4" : ""}>
            <p className="text-sm font-medium text-gray-700 mb-2">Request custom</p>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Describe what you want — e.g. 'something for home, no equipment'…"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
            />
            <button
              onClick={() => fetchAlts(true)}
              disabled={loading || !customText.trim()}
              className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-40 transition-colors"
            >
              {loading ? "Getting suggestions…" : "Get suggestions"}
            </button>
          </div>

          {/* Confirm */}
          {chosen && (
            <button
              onClick={() => onSelect(chosen)}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {mode === "swap" ? "Replace exercise" : "Add exercise"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MuscleBreakdown ───────────────────────────────────────────────────────────

function MuscleBreakdown({ workoutPlan }) {
  const [open, setOpen] = useState(false);
  const counts = getMuscleBreakdown(workoutPlan);
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3"
      >
        Muscle Group Breakdown
        <span className="text-sm text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-400">
              No muscle data yet — swap exercises to add muscle group tags.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {entries.map(([muscle, count]) => (
                <span
                  key={muscle}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${
                    count >= 2
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {muscle} × {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Plan() {
  const [plan, setPlan] = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingStatus, setSavingStatus] = useState("idle"); // "idle"|"saving"|"saved"
  const [swapModal, setSwapModal] = useState(null);
  const { toast, showToast } = useToast();
  const location = useLocation();
  const shouldAutoGenerate = useRef(location.state?.autoGenerate === true);
  const saveTimer = useRef(null);

  const profileWeight = profile?.weight_kg || 70;
  const unit = profile?.unit_preference || "metric";

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([getCurrentPlan(), getProfile().catch(() => null)])
      .then(([planData, profileData]) => {
        setPlan(planData);
        if (planData?.workout_plan) setWorkoutPlan(planData.workout_plan);
        setProfile(profileData);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoading && shouldAutoGenerate.current) {
      shouldAutoGenerate.current = false;
      window.history.replaceState({}, document.title);
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ── Auto-save ─────────────────────────────────────────────────────────────

  const scheduleAutoSave = useCallback((wp) => {
    setSavingStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await patchWorkoutPlan(wp);
        setSavingStatus("saved");
        setTimeout(() => setSavingStatus("idle"), 2000);
      } catch {
        setSavingStatus("idle");
      }
    }, 600);
  }, []);

  // ── Generate ──────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const data = await generatePlan();
      setPlan(data);
      setWorkoutPlan(data.workout_plan);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to generate plan.", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Workout plan mutations ────────────────────────────────────────────────

  function updateExerciseField(day, idx, field, value) {
    const newWP = {
      ...workoutPlan,
      [day]: {
        ...workoutPlan[day],
        exercises: workoutPlan[day].exercises.map((ex, i) =>
          i === idx ? { ...ex, [field]: value } : ex
        ),
      },
    };
    setWorkoutPlan(newWP);
    scheduleAutoSave(newWP);
  }

  function removeExercise(day, idx) {
    const newWP = {
      ...workoutPlan,
      [day]: {
        ...workoutPlan[day],
        exercises: workoutPlan[day].exercises.filter((_, i) => i !== idx),
      },
    };
    setWorkoutPlan(newWP);
    scheduleAutoSave(newWP);
  }

  function replaceExercise(day, idx, newEx) {
    const newWP = {
      ...workoutPlan,
      [day]: {
        ...workoutPlan[day],
        exercises: workoutPlan[day].exercises.map((ex, i) => (i === idx ? newEx : ex)),
      },
    };
    setWorkoutPlan(newWP);
    scheduleAutoSave(newWP);
    setSwapModal(null);
  }

  function insertExercise(day, afterIdx, newEx) {
    const exercises = workoutPlan[day]?.exercises || [];
    const newExercises = [
      ...exercises.slice(0, afterIdx + 1),
      newEx,
      ...exercises.slice(afterIdx + 1),
    ];
    const newWP = {
      ...workoutPlan,
      [day]: { ...workoutPlan[day], exercises: newExercises },
    };
    setWorkoutPlan(newWP);
    scheduleAutoSave(newWP);
    setSwapModal(null);
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────

  function handleDragEnd({ source, destination }) {
    if (!destination || source.droppableId === destination.droppableId) return;

    const fromDay = source.droppableId;
    const toDay = destination.droppableId;

    // Swap workout contents between the two days.
    const newWP = {
      ...workoutPlan,
      [fromDay]: workoutPlan[toDay] ?? null,
      [toDay]: workoutPlan[fromDay],
    };
    setWorkoutPlan(newWP);
    scheduleAutoSave(newWP);
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openSwap(day, idx, exercise, focus) {
    setSwapModal({ mode: "swap", day, exerciseIdx: idx, exercise, workoutFocus: focus });
  }

  function openAdd(day, afterIdx, focus) {
    setSwapModal({ mode: "add", day, insertAfterIdx: afterIdx, workoutFocus: focus });
  }

  function handleModalSelect(newEx) {
    if (!swapModal) return;
    if (swapModal.mode === "swap") {
      replaceExercise(swapModal.day, swapModal.exerciseIdx, newEx);
    } else {
      insertExercise(swapModal.day, swapModal.insertAfterIdx, newEx);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const mealPlan = plan?.meal_plan;
  const notes = plan?.notes;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">My Plan</h1>
          {savingStatus === "saving" && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              Saving…
            </span>
          )}
          {savingStatus === "saved" && (
            <span className="text-xs text-green-500">✓ Saved</span>
          )}
        </div>
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

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!isLoading && !plan && !isGenerating && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-2 font-medium">
            No plan yet — click Generate My Plan to get started 🚀
          </p>
        </div>
      )}

      {plan && workoutPlan && (
        <div className="space-y-10">

          {/* ── Workout Plan ── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Workout Plan</h2>
            <p className="text-xs text-gray-400 mb-4">Drag a day card to swap it with another day</p>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-3">
                {DAYS.map((day) => {
                  const dayPlan = workoutPlan[day];
                  const kcal = estCalories(dayPlan?.focus, dayPlan?.duration_minutes, profileWeight);

                  return (
                    <Droppable key={day} droppableId={day}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`shrink-0 w-44 rounded-xl border flex flex-col transition-colors ${
                            snapshot.isDraggingOver
                              ? "border-blue-400 bg-blue-50"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          {/* Day label — fixed, outside draggable */}
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">
                            {DAY_LABELS[day]}
                          </p>

                          {dayPlan ? (
                            <Draggable draggableId={day} index={0}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`flex-1 flex flex-col px-3 pb-3 ${
                                    dragSnapshot.isDragging ? "opacity-80" : ""
                                  }`}
                                >
                                  {/* Drag handle — grab here to reorder */}
                                  <div
                                    {...dragProvided.dragHandleProps}
                                    className="flex items-center justify-between mb-1 cursor-grab active:cursor-grabbing"
                                    title="Drag to move this workout to another day"
                                  >
                                    <p className="font-semibold text-gray-900 text-sm leading-tight">
                                      {dayPlan.focus}
                                    </p>
                                    <span className="text-gray-300 text-base select-none ml-1">⠿</span>
                                  </div>

                                  {/* Duration + estimated calories */}
                                  <p className="text-xs text-blue-600 mb-2">
                                    {dayPlan.duration_minutes} min
                                    {kcal ? ` · ~${kcal} kcal` : ""}
                                  </p>

                                  {/* Exercises */}
                                  {(dayPlan.exercises || []).map((ex, idx) => (
                                    <div key={idx}>
                                      <ExerciseRow
                                        exercise={ex}
                                        unit={unit}
                                        onUpdate={(field, val) => updateExerciseField(day, idx, field, val)}
                                        onSwap={() => openSwap(day, idx, ex, dayPlan.focus)}
                                        onRemove={() => removeExercise(day, idx)}
                                      />
                                      <AddButton onClick={() => openAdd(day, idx, dayPlan.focus)} />
                                    </div>
                                  ))}

                                  {/* Add at end if no exercises */}
                                  {(dayPlan.exercises || []).length === 0 && (
                                    <AddButton onClick={() => openAdd(day, -1, dayPlan.focus)} />
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ) : (
                            <div className="flex-1 min-h-[80px] flex items-center justify-center text-gray-300 text-sm pb-3">
                              Rest Day 😴
                            </div>
                          )}

                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </DragDropContext>
          </section>

          {/* ── Muscle Group Breakdown ── */}
          <MuscleBreakdown workoutPlan={workoutPlan} />

          {/* ── Meal Plan ── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Meal Plan</h2>

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

      {/* ── Swap / Add Modal ── */}
      {swapModal && (
        <SwapModal
          mode={swapModal.mode}
          exercise={swapModal.exercise}
          workoutFocus={swapModal.workoutFocus}
          profileWeight={profileWeight}
          onClose={() => setSwapModal(null)}
          onSelect={handleModalSelect}
        />
      )}
    </div>
  );
}
