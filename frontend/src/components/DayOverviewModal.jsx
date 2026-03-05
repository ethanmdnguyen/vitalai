// DayOverviewModal — full day workout detail popup.
// Double-clicking a day column header in Plan.jsx opens this modal.
// Sections: sticky header (stats), muscle groups, exercise list, sticky footer (log/regen).
// Edit mode: drag-to-reorder exercises, remove buttons, hover insert zones, Add Exercise panel.

import { useState, useEffect, Fragment } from "react";
import { Edit3, Check, X, GripVertical, Plus } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { swapExercise, regenerateDay } from "../api/plans";
import { getSavedWorkouts } from "../api/savedWorkouts";
import {
  getMuscleTagStyle,
  getBroadGroupsForExercises,
} from "../utils/muscleGroups";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_NAMES = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

const MUSCLE_CHIPS = ["Chest", "Shoulders", "Triceps", "Biceps", "Back", "Core", "Legs", "Glutes"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDifficulty(exercises) {
  const count = (exercises || []).length;
  if (count <= 3) return { label: "Easy",   style: "bg-green-100 text-green-700" };
  if (count <= 6) return { label: "Medium", style: "bg-yellow-100 text-yellow-700" };
  return               { label: "Hard",   style: "bg-red-100 text-red-700" };
}

function estDayCalories(focus, durationMin, weightKg) {
  if (!durationMin || !weightKg) return null;
  const f = (focus || "").toLowerCase();
  let met = 5;
  if (f.includes("hiit") || f.includes("interval")) met = 10;
  else if (f.includes("run") || f.includes("cardio")) met = 9;
  else if (f.includes("swim"))                        met = 8;
  else if (f.includes("cycl") || f.includes("bike")) met = 7;
  else if (f.includes("yoga"))                        met = 3;
  return Math.round(met * weightKg * (durationMin / 60));
}

function formatWeightDisplay(weightKg, unit) {
  if (weightKg == null || weightKg === 0) return null;
  if (unit === "imperial") return `${Math.round(weightKg * 2.205)} lb`;
  return `${weightKg} kg`;
}

// ── InsertZone ────────────────────────────────────────────────────────────────
// Hover-reveal blue line + ➕ between exercise cards in edit mode.

function InsertZone({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex items-center justify-center h-7 cursor-pointer select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div
        className="absolute inset-x-0 h-0.5 transition-all duration-150"
        style={{ backgroundColor: hovered ? "#3b82f6" : "transparent" }}
      />
      <button
        className="relative z-10 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center transition-all duration-150"
        style={{ opacity: hovered ? 1 : 0, transform: hovered ? "scale(1)" : "scale(0.6)" }}
        tabIndex={-1}
      >
        <Plus size={10} />
      </button>
    </div>
  );
}

// ── AddExercisePanel ──────────────────────────────────────────────────────────
// Sub-modal with "My Workouts" and "Generate with AI" tabs.

function AddExercisePanel({ profile, onInsert, onClose }) {
  const [tab,          setTab]          = useState("ai");
  const [savedList,    setSavedList]    = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [muscles,      setMuscles]      = useState([]);
  const [aiNotes,      setAiNotes]      = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [suggestions,  setSuggestions]  = useState([]);

  useEffect(() => {
    if (tab !== "saved") return;
    setLoadingSaved(true);
    getSavedWorkouts()
      .then(setSavedList)
      .catch(() => setSavedList([]))
      .finally(() => setLoadingSaved(false));
  }, [tab]);

  function toggleMuscle(m) {
    setMuscles((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  async function handleGenerate() {
    if (!muscles.length) return;
    setGenerating(true);
    setSuggestions([]);
    try {
      const data = await swapExercise({
        primaryMuscle: muscles.join(", "),
        userWeightKg:  profile?.weight_kg,
        customRequest: aiNotes || undefined,
      });
      setSuggestions(data.alternatives || []);
    } catch { /* silent */ }
    setGenerating(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-gray-900">Add Exercise</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0">
          {[["saved", "My Workouts"], ["ai", "Generate with AI"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === id
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* My Workouts tab */}
          {tab === "saved" && (
            <>
              {loadingSaved ? (
                <div className="flex justify-center py-8">
                  <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : savedList.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No saved workouts yet. Save a workout from your plan to see it here.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedList.map((sw) => {
                    let exercises = [];
                    try {
                      exercises = typeof sw.exercises === "string"
                        ? JSON.parse(sw.exercises) : (sw.exercises || []);
                    } catch { exercises = []; }
                    const first = exercises[0];
                    return (
                      <button
                        key={sw.id}
                        onClick={() => first && onInsert(first)}
                        className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-blue-400 transition-colors"
                      >
                        <p className="font-semibold text-gray-900 text-sm">{sw.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sw.type} · {exercises.length} exercises
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Generate with AI tab */}
          {tab === "ai" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Target muscle group(s)</p>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_CHIPS.map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleMuscle(m)}
                      style={muscles.includes(m) ? getMuscleTagStyle(m) : undefined}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all border ${
                        muscles.includes(m)
                          ? "border-transparent"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={aiNotes}
                  onChange={(e) => setAiNotes(e.target.value)}
                  placeholder="e.g. bodyweight only, no equipment…"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || muscles.length === 0}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating…
                  </span>
                ) : "Generate Exercise"}
              </button>

              {suggestions.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Suggestions — click to add
                  </p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => onInsert(s)}
                      className="w-full text-left p-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-colors"
                    >
                      <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.sets} sets × {s.reps}</p>
                      {s.primary_muscles?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.primary_muscles.map((m) => (
                            <span key={m} style={getMuscleTagStyle(m)} className="text-xs px-1.5 py-0.5 rounded-full">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RegenerateDayModal ────────────────────────────────────────────────────────

function RegenerateDayModal({ day, onClose, onRegenerate, isRegenerating }) {
  const [feedback, setFeedback] = useState("");

  const CHIPS = [
    "More compound lifts",
    "Less volume",
    "Swap chest for back",
    "Add more core work",
    "Shorter session",
  ];

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-900">Regenerate {DAY_NAMES[day]}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Quick suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() =>
                  setFeedback((prev) => prev ? `${prev}, ${chip.toLowerCase()}` : chip.toLowerCase())
                }
                className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors font-medium"
              >
                {chip}
              </button>
            ))}
          </div>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Any specific feedback for this day…"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onRegenerate(feedback)}
              disabled={isRegenerating}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all"
            >
              {isRegenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Regenerating…
                </span>
              ) : "Regenerate Day →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DayOverviewModal ──────────────────────────────────────────────────────────

export default function DayOverviewModal({ day, dayPlan, profile, onClose, onUpdateDay, onRegenerateDaySuccess }) {
  const [editMode,       setEditMode]       = useState(false);
  const [localExercises, setLocalExercises] = useState(dayPlan.exercises || []);
  const [localTitle,     setLocalTitle]     = useState(dayPlan.focus || "");
  const [showAddPanel,   setShowAddPanel]   = useState(null); // { insertAt } | null
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const unit       = profile?.unit_system || profile?.unit_preference || "metric";
  const weightKg   = profile?.weight_kg;
  const broadGroups = getBroadGroupsForExercises(localExercises);
  const difficulty  = getDifficulty(localExercises);
  const kcal        = estDayCalories(localTitle, dayPlan.duration_minutes, weightKg);

  // Save changes and exit edit mode.
  function handleDoneEdit() {
    setEditMode(false);
    onUpdateDay(day, { ...dayPlan, focus: localTitle, exercises: localExercises });
  }

  // Close: save if in edit mode.
  function handleClose() {
    if (editMode) {
      onUpdateDay(day, { ...dayPlan, focus: localTitle, exercises: localExercises });
    }
    onClose();
  }

  // DnD reorder within modal.
  function handleDragEnd({ source, destination }) {
    if (!destination || source.index === destination.index) return;
    const items = [...localExercises];
    const [moved] = items.splice(source.index, 1);
    items.splice(destination.index, 0, moved);
    setLocalExercises(items);
  }

  function removeExercise(idx) {
    setLocalExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  // Insert exercise after `insertAt` (use -1 to prepend, length-1 to append).
  function insertExercise(insertAt, exercise) {
    setLocalExercises((prev) => {
      const arr = [...prev];
      arr.splice(insertAt + 1, 0, exercise);
      return arr;
    });
    setShowAddPanel(null);
  }

  async function handleRegenerate(feedback) {
    setIsRegenerating(true);
    try {
      const updated = await regenerateDay(day, feedback);
      onRegenerateDaySuccess(updated);
      onClose();
    } catch (err) {
      console.error("[DayOverviewModal] regenerate failed:", err);
    } finally {
      setIsRegenerating(false);
      setShowRegenModal(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">

        {/* ── Sticky Header ── */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b z-10 px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                {DAY_NAMES[day]}
              </p>
              {editMode ? (
                <input
                  autoFocus
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  placeholder="Workout focus…"
                  className="text-xl font-bold text-gray-900 w-full border-b-2 border-blue-400 focus:outline-none bg-transparent pb-0.5"
                />
              ) : (
                <h2 className="text-xl font-bold text-gray-900 leading-tight">
                  {localTitle || "Workout"}
                </h2>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {editMode ? (
                <button
                  onClick={handleDoneEdit}
                  className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors"
                >
                  <Check size={15} />
                  Done
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit workout"
                >
                  <Edit3 size={18} />
                </button>
              )}
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-1"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            {dayPlan.duration_minutes && (
              <span>⏱ {dayPlan.duration_minutes} min</span>
            )}
            {kcal && <span>🔥 ~{kcal} kcal</span>}
            <span>💪 {localExercises.length} exercises</span>
            <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${difficulty.style}`}>
              {difficulty.label}
            </span>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Muscle groups section */}
          {broadGroups.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Muscle Groups
              </p>
              <div className="flex flex-wrap gap-1.5">
                {broadGroups.map(({ group, color }) => (
                  <span
                    key={group}
                    style={{
                      backgroundColor: `${color}1a`,
                      color,
                      border: `1px solid ${color}40`,
                    }}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                  >
                    {group}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Exercises section */}
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Exercises
            </p>

            {editMode ? (
              // ── Edit mode: DnD + remove buttons + insert zones ──
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="modal-exercises">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {localExercises.map((ex, idx) => (
                        <Fragment key={`modal-ex-${idx}-${ex.name}`}>
                          <Draggable draggableId={`modal-ex-${idx}`} index={idx}>
                            {(drag, dragSnap) => (
                              <div
                                ref={drag.innerRef}
                                {...drag.draggableProps}
                                className={`flex items-start gap-2 p-3 bg-gray-50 rounded-xl ${
                                  dragSnap.isDragging ? "shadow-lg opacity-90" : ""
                                }`}
                              >
                                {/* Drag handle */}
                                <span
                                  {...drag.dragHandleProps}
                                  className="text-gray-300 cursor-grab active:cursor-grabbing mt-0.5 shrink-0"
                                >
                                  <GripVertical size={16} />
                                </span>

                                {/* Exercise content */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm leading-tight">
                                    {ex.name}
                                  </p>
                                  {((ex.primary_muscles?.length || 0) > 0 || (ex.secondary_muscles?.length || 0) > 0) && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {(ex.primary_muscles || []).map((m) => (
                                        <span key={m} style={getMuscleTagStyle(m)} className="text-xs px-1.5 py-0.5 rounded-full font-medium">
                                          {m}
                                        </span>
                                      ))}
                                      {(ex.secondary_muscles || []).map((m) => (
                                        <span key={m} style={{ ...getMuscleTagStyle(m), opacity: 0.65 }} className="text-xs px-1.5 py-0.5 rounded-full">
                                          {m}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Sets / reps / weight */}
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-medium text-gray-900">
                                    {ex.sets} × {ex.reps}
                                  </p>
                                  {formatWeightDisplay(ex.weight, unit) && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {formatWeightDisplay(ex.weight, unit)}
                                    </p>
                                  )}
                                </div>

                                {/* Remove button */}
                                <button
                                  onClick={() => removeExercise(idx)}
                                  className="text-red-400 hover:text-red-600 transition-colors ml-1 shrink-0 mt-0.5"
                                  title="Remove exercise"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            )}
                          </Draggable>

                          {/* Insert zone between adjacent cards only */}
                          {idx < localExercises.length - 1 && (
                            <InsertZone onClick={() => setShowAddPanel({ insertAt: idx })} />
                          )}
                        </Fragment>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              // ── View mode: static cards ──
              <div className="space-y-2">
                {localExercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">{ex.name}</p>
                      {((ex.primary_muscles?.length || 0) > 0 || (ex.secondary_muscles?.length || 0) > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(ex.primary_muscles || []).map((m) => (
                            <span key={m} style={getMuscleTagStyle(m)} className="text-xs px-1.5 py-0.5 rounded-full font-medium">
                              {m}
                            </span>
                          ))}
                          {(ex.secondary_muscles || []).map((m) => (
                            <span key={m} style={{ ...getMuscleTagStyle(m), opacity: 0.65 }} className="text-xs px-1.5 py-0.5 rounded-full">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-gray-900">{ex.sets} × {ex.reps}</p>
                      {formatWeightDisplay(ex.weight, unit) && (
                        <p className="text-xs text-gray-400 mt-0.5">{formatWeightDisplay(ex.weight, unit)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Exercise button (edit mode) */}
            {editMode && (
              <button
                onClick={() => setShowAddPanel({ insertAt: localExercises.length - 1 })}
                className="w-full mt-3 py-2.5 border-2 border-dashed border-blue-200 text-blue-500 rounded-xl text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                + Add Exercise
              </button>
            )}
          </section>
        </div>

        {/* ── Sticky Footer ── */}
        <div className="sticky bottom-0 bg-white rounded-b-2xl border-t px-5 py-4 flex gap-3">
          <button
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
            onClick={handleClose}
            title="Close and go to the Log page to record this workout"
          >
            Log This Workout
          </button>
          <button
            onClick={() => setShowRegenModal(true)}
            className="py-2.5 px-4 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Regenerate Day
          </button>
        </div>
      </div>

      {/* ── Sub-modals (z-[60] so they render above the main modal z-50) ── */}
      {showAddPanel && (
        <AddExercisePanel
          profile={profile}
          onInsert={(ex) => insertExercise(showAddPanel.insertAt, ex)}
          onClose={() => setShowAddPanel(null)}
        />
      )}

      {showRegenModal && (
        <RegenerateDayModal
          day={day}
          onClose={() => setShowRegenModal(false)}
          onRegenerate={handleRegenerate}
          isRegenerating={isRegenerating}
        />
      )}
    </div>
  );
}
