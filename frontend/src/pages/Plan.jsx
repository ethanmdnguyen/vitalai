// Plan page — interactive AI workout + meal plan.
// v3: simplified exercise cards, double-click detail modal, hover muscle highlights,
//     per-exercise DnD reordering, editable day titles, regenerate-with-feedback modal.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  SlidersHorizontal, Clock, Dumbbell, Zap, RefreshCw, Trash2, Bookmark,
  Plus, Moon, Check, ChevronDown, ChevronUp, X, Pencil, GripVertical,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import DayOverviewModal from "../components/DayOverviewModal";
import {
  generatePlan, getCurrentPlan,
  patchWorkoutPlan, patchMealPlan,
  swapExercise, swapMeal,
} from "../api/plans";
import { getProfile } from "../api/profile";
import { saveToMyMeals } from "../api/meals";
import Toast, { useToast } from "../components/Toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS  = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};
const DAY_LABELS_FULL = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday",
  friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};
const MEALS = ["breakfast", "lunch", "dinner", "snack"];
const MET   = { hiit: 10, running: 9, swimming: 8, cycling: 7, weightlifting: 5, yoga: 3, pilates: 3 };

// Keyword → muscle groups (used when AI doesn't supply primary_muscles).
const MUSCLE_LOOKUP = {
  // ── Chest ──────────────────────────────────────────────────────────────────
  "bench press":    ["Chest", "Triceps"],
  "push-up":        ["Chest", "Triceps"],
  "push up":        ["Chest", "Triceps"],
  "pushup":         ["Chest", "Triceps"],
  "chest fly":      ["Chest"],
  "chest press":    ["Chest", "Triceps"],
  "dumbbell fly":   ["Chest"],
  "cable fly":      ["Chest"],
  "cable crossover":["Chest"],
  "incline press":  ["Chest", "Shoulders"],
  "decline press":  ["Chest"],
  "dip":            ["Chest", "Triceps"],
  "pec deck":       ["Chest"],
  // ── Back ───────────────────────────────────────────────────────────────────
  "pull-up":        ["Back", "Biceps"],
  "pull up":        ["Back", "Biceps"],
  "pullup":         ["Back", "Biceps"],
  "chin-up":        ["Back", "Biceps"],
  "chin up":        ["Back", "Biceps"],
  "row":            ["Back", "Biceps"],
  "deadlift":       ["Back", "Glutes", "Hamstrings"],
  "lat pulldown":   ["Back", "Biceps"],
  "face pull":      ["Shoulders", "Back"],
  "hyperextension": ["Back", "Glutes"],
  "good morning":   ["Back", "Hamstrings"],
  "superman":       ["Back", "Glutes"],
  "reverse hyper":  ["Glutes", "Back"],
  "back extension": ["Back", "Glutes"],
  "seated row":     ["Back", "Biceps"],
  "cable row":      ["Back", "Biceps"],
  "pendlay":        ["Back", "Biceps"],
  "t-bar row":      ["Back", "Biceps"],
  "muscle up":      ["Back", "Chest"],
  "pull down":      ["Back", "Biceps"],
  "nordic":         ["Hamstrings"],
  // ── Shoulders ──────────────────────────────────────────────────────────────
  "shoulder press": ["Shoulders", "Triceps"],
  "overhead press": ["Shoulders", "Triceps"],
  "ohp":            ["Shoulders", "Triceps"],
  "lateral raise":  ["Shoulders"],
  "front raise":    ["Shoulders"],
  "upright row":    ["Shoulders", "Biceps"],
  "arnold":         ["Shoulders", "Triceps"],
  "handstand":      ["Shoulders", "Core"],
  "pike":           ["Shoulders", "Core"],
  "external rotation": ["Shoulders"],
  "internal rotation": ["Shoulders"],
  "shoulder rotation": ["Shoulders"],
  "band pull apart": ["Shoulders", "Back"],
  // ── Biceps ─────────────────────────────────────────────────────────────────
  "bicep curl":     ["Biceps"],
  "biceps curl":    ["Biceps"],
  "hammer curl":    ["Biceps"],
  "preacher curl":  ["Biceps"],
  "concentration curl": ["Biceps"],
  "cable curl":     ["Biceps"],
  "reverse curl":   ["Biceps"],
  "curl":           ["Biceps"],
  // ── Triceps ────────────────────────────────────────────────────────────────
  "tricep":         ["Triceps"],
  "skull crusher":  ["Triceps"],
  "kickback":       ["Triceps"],
  "tricep dip":     ["Triceps"],
  "close grip":     ["Triceps", "Chest"],
  "rope pushdown":  ["Triceps"],
  "pushdown":       ["Triceps"],
  "overhead extension": ["Triceps"],
  // ── Core ───────────────────────────────────────────────────────────────────
  "plank":          ["Core"],
  "side plank":     ["Core"],
  "crunch":         ["Core"],
  "sit-up":         ["Core"],
  "sit up":         ["Core"],
  "russian twist":  ["Core"],
  "leg raise":      ["Core"],
  "bicycle":        ["Core"],
  "ab wheel":       ["Core"],
  "hollow body":    ["Core"],
  "v-up":           ["Core"],
  "v up":           ["Core"],
  "toe touch":      ["Core"],
  "dead bug":       ["Core"],
  "bird dog":       ["Core", "Back"],
  "cat cow":        ["Core", "Back"],
  "cat-cow":        ["Core", "Back"],
  "flutter kick":   ["Core", "Cardio"],
  "hanging leg":    ["Core"],
  "cable crunch":   ["Core"],
  "wood chop":      ["Core"],
  "pallof press":   ["Core"],
  "l-sit":          ["Core"],
  "l sit":          ["Core"],
  "ab rollout":     ["Core"],
  "flutter":        ["Core"],
  "mountain climber":["Core", "Cardio"],
  // ── Quads & Glutes ─────────────────────────────────────────────────────────
  "squat":          ["Quads", "Glutes"],
  "lunge":          ["Quads", "Glutes"],
  "split squat":    ["Quads", "Glutes"],
  "bulgarian":      ["Quads", "Glutes"],
  "sumo squat":     ["Quads", "Glutes"],
  "goblet squat":   ["Quads", "Glutes"],
  "pistol squat":   ["Quads", "Glutes"],
  "pistol":         ["Quads", "Glutes"],
  "leg press":      ["Quads", "Glutes"],
  "leg extension":  ["Quads"],
  "wall sit":       ["Quads"],
  "step-up":        ["Quads", "Glutes"],
  "step up":        ["Quads", "Glutes"],
  "box jump":       ["Quads", "Glutes"],
  "box step":       ["Quads", "Glutes"],
  "tuck jump":      ["Full Body"],
  "broad jump":     ["Full Body"],
  // ── Hamstrings ─────────────────────────────────────────────────────────────
  "leg curl":       ["Hamstrings"],
  "romanian deadlift": ["Hamstrings", "Glutes"],
  "rdl":            ["Hamstrings", "Glutes"],
  "hip hinge":      ["Hamstrings", "Glutes"],
  // ── Glutes ─────────────────────────────────────────────────────────────────
  "glute bridge":   ["Glutes"],
  "hip thrust":     ["Glutes"],
  "fire hydrant":   ["Glutes"],
  "donkey kick":    ["Glutes"],
  "clamshell":      ["Glutes"],
  "hip circle":     ["Glutes", "Core"],
  "hip raise":      ["Glutes", "Core"],
  "bridge":         ["Glutes", "Core"],
  "single leg":     ["Quads", "Glutes"],
  // ── Calves ─────────────────────────────────────────────────────────────────
  "calf raise":     ["Calves"],
  "seated calf":    ["Calves"],
  "standing calf":  ["Calves"],
  // ── Yoga / Pilates / Mobility ───────────────────────────────────────────────
  "warrior":        ["Quads", "Core"],
  "downward dog":   ["Shoulders", "Core"],
  "downward-facing dog": ["Shoulders", "Core"],
  "cobra":          ["Back", "Core"],
  "child's pose":   ["Back", "Core"],
  "child pose":     ["Back", "Core"],
  "pigeon":         ["Glutes"],
  "tree pose":      ["Core", "Quads"],
  "sun salutation": ["Full Body"],
  "yoga flow":      ["Full Body"],
  "pilates roll":   ["Core"],
  "pilates hundred": ["Core"],
  "reformer":       ["Core", "Full Body"],
  "hip flexor stretch": ["Core"],
  "hip flexor":     ["Core", "Quads"],
  "foam roll":      ["Full Body"],
  "mobility":       ["Full Body"],
  "stretch":        ["Full Body"],
  // ── Full Body / Cardio ─────────────────────────────────────────────────────
  "burpee":         ["Full Body"],
  "jumping jack":   ["Cardio"],
  "jump rope":      ["Cardio"],
  "running":        ["Cardio"],
  "cycling":        ["Cardio"],
  "swim":           ["Full Body"],
  "freestyle":      ["Full Body"],
  "backstroke":     ["Full Body"],
  "breaststroke":   ["Full Body"],
  "butterfly stroke": ["Full Body"],
  "clean":          ["Full Body"],
  "snatch":         ["Full Body"],
  "thruster":       ["Full Body"],
  "kettlebell":     ["Full Body"],
  "turkish get-up": ["Full Body"],
  "turkish getup":  ["Full Body"],
  "farmer":         ["Full Body"],
  "sled push":      ["Full Body"],
  "sled pull":      ["Full Body"],
  "battle rope":    ["Full Body"],
  "tire flip":      ["Full Body"],
  "sprint":         ["Cardio"],
  "jog":            ["Cardio"],
  "stair":          ["Quads", "Cardio"],
  "elliptical":     ["Cardio"],
  "row machine":    ["Back", "Cardio"],
  "rowing machine": ["Back", "Cardio"],
  "jump squat":     ["Quads", "Glutes"],
  "plyometric":     ["Full Body"],
  "agility":        ["Cardio"],
};

const MUSCLE_COLORS = {
  "Chest":       "bg-rose-100 text-rose-700",
  "Back":        "bg-indigo-100 text-indigo-700",
  "Shoulders":   "bg-purple-100 text-purple-700",
  "Biceps":      "bg-blue-100 text-blue-700",
  "Triceps":     "bg-cyan-100 text-cyan-700",
  "Core":        "bg-yellow-100 text-yellow-700",
  "Quads":       "bg-emerald-100 text-emerald-700",
  "Hamstrings":  "bg-green-100 text-green-700",
  "Glutes":      "bg-orange-100 text-orange-700",
  "Calves":      "bg-lime-100 text-lime-700",
  "Full Body":   "bg-gray-200 text-gray-700",
  "Cardio":      "bg-pink-100 text-pink-700",
};

// Maps anatomical / verbose muscle names → standard group keys used in MUSCLE_COLORS.
const MUSCLE_NORMALIZE = {
  // Chest
  "pectoralis major": "Chest", "pectoralis minor": "Chest",
  "upper chest": "Chest",      "lower chest": "Chest",
  "pec ":        "Chest",
  // Shoulders
  "anterior deltoid":  "Shoulders", "lateral deltoid":  "Shoulders",
  "posterior deltoid": "Shoulders", "rear deltoid":     "Shoulders",
  "deltoid":           "Shoulders", "front delt":       "Shoulders",
  "side delt":         "Shoulders", "rear delt":        "Shoulders",
  // Triceps
  "triceps brachii": "Triceps", "triceps": "Triceps",
  // Biceps
  "biceps brachii": "Biceps", "brachialis": "Biceps", "brachioradialis": "Biceps",
  "biceps": "Biceps",
  // Back
  "latissimus dorsi": "Back", "lats": "Back", "trapezius": "Back",
  "traps": "Back",             "rhomboids": "Back",  "erector spinae": "Back",
  "lower back": "Back",        "upper back": "Back",
  // Core
  "rectus abdominis": "Core", "obliques": "Core", "transverse abdominis": "Core",
  "abdominals": "Core",        "abs": "Core",      "hip flexors": "Core",
  // Quads
  "quadriceps": "Quads", "rectus femoris": "Quads",
  "vastus lateralis": "Quads", "vastus medialis": "Quads", "vastus": "Quads",
  "quads": "Quads",
  // Hamstrings
  "hamstrings": "Hamstrings", "biceps femoris": "Hamstrings",
  "semitendinosus": "Hamstrings", "semimembranosus": "Hamstrings",
  // Glutes
  "gluteus maximus": "Glutes", "gluteus medius": "Glutes",
  "gluteus minimus": "Glutes", "gluteus": "Glutes", "glutes": "Glutes",
  // Calves
  "gastrocnemius": "Calves", "soleus": "Calves", "calves": "Calves",
};

// Word-stem → muscle group (last-resort fallback when MUSCLE_LOOKUP has no match).
// Checks if any word in the exercise name starts with a stem listed here.
const WORD_SCAN_MAP = {
  chest:      "Chest",
  pec:        "Chest",
  back:       "Back",
  lat:        "Back",
  trap:       "Back",
  lats:       "Back",
  traps:      "Back",
  shoulder:   "Shoulders",
  delt:       "Shoulders",
  rotator:    "Shoulders",
  bicep:      "Biceps",
  tricep:     "Triceps",
  core:       "Core",
  ab:         "Core",
  abs:        "Core",
  oblique:    "Core",
  glute:      "Glutes",
  glutes:     "Glutes",
  hip:        "Glutes",
  butt:       "Glutes",
  quad:       "Quads",
  quads:      "Quads",
  thigh:      "Quads",
  hamstring:  "Hamstrings",
  calf:       "Calves",
  calves:     "Calves",
  cardio:     "Cardio",
  sprint:     "Cardio",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getMuscleColor(muscle) {
  return MUSCLE_COLORS[muscle] || "bg-gray-100 text-gray-600";
}

// Converts a verbose / anatomical muscle name to a standard MUSCLE_COLORS key.
// e.g. "upper chest (pectoralis major - clavicular head)" → "Chest"
//      "Anterior Deltoid" → "Shoulders"
//      "Chest" (already standard) → "Chest"
function normalizeMuscle(name) {
  if (!name) return name;
  // Already a standard name?
  if (MUSCLE_COLORS[name]) return name;
  const lower = name.toLowerCase();
  // Strip parenthetical annotation: "upper chest (pectoralis...)" → "upper chest"
  const base = lower.replace(/\s*\(.*\)/, "").trim();
  // Substring scan through normalize map (longest-key-first is not needed for these unique prefixes)
  for (const [key, val] of Object.entries(MUSCLE_NORMALIZE)) {
    if (base.includes(key) || lower.includes(key)) return val;
  }
  // Fallback: capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Returns the MUSCLE_COLORS class string for any raw or normalized muscle name.
function getMuscleColorByName(rawName) {
  return getMuscleColor(normalizeMuscle(rawName));
}

// Returns { primary: string[], secondary: string[] } for an exercise.
// Uses AI-supplied arrays if present, otherwise derives from name lookup,
// and finally falls back to a word-stem scan of the exercise name.
function getMusclesForExercise(ex) {
  if (ex.primary_muscles?.length) {
    return { primary: ex.primary_muscles, secondary: ex.secondary_muscles || [] };
  }
  const name = (ex.name || "").toLowerCase();
  for (const [key, muscles] of Object.entries(MUSCLE_LOOKUP)) {
    if (name.includes(key)) {
      return { primary: muscles.slice(0, 2), secondary: muscles.slice(2) };
    }
  }
  // Word-stem fallback: split exercise name into words and check each against WORD_SCAN_MAP.
  const words = name.replace(/[^a-z\s-]/g, " ").split(/[\s-]+/).filter((w) => w.length >= 2);
  const found = [];
  for (const word of words) {
    for (const [stem, group] of Object.entries(WORD_SCAN_MAP)) {
      if ((word === stem || word.startsWith(stem)) && !found.includes(group)) {
        found.push(group);
      }
    }
  }
  if (found.length > 0) {
    return { primary: found.slice(0, 2), secondary: found.slice(2) };
  }
  return { primary: [], secondary: [] };
}

function getMuscleBreakdown(wp) {
  const counts = {};
  Object.values(wp || {}).forEach((day) => {
    if (!day) return;
    (day.exercises || []).forEach((ex) => {
      const normalized = [...new Set(getMusclesForExercise(ex).primary.map(normalizeMuscle))];
      normalized.forEach((m) => { counts[m] = (counts[m] || 0) + 1; });
    });
  });
  return counts;
}

function getMet(focus = "") {
  const f = focus.toLowerCase();
  if (f.includes("hiit") || f.includes("interval")) return MET.hiit;
  if (f.includes("run") || f.includes("cardio"))    return MET.running;
  if (f.includes("swim"))                           return MET.swimming;
  if (f.includes("cycl") || f.includes("bike"))     return MET.cycling;
  if (f.includes("yoga"))                           return MET.yoga;
  if (f.includes("pilates"))                        return MET.pilates;
  return MET.weightlifting;
}

function estCalories(focus, durationMin, weightKg) {
  if (!durationMin || !weightKg) return null;
  return Math.round(getMet(focus) * weightKg * (durationMin / 60));
}

// Rough per-exercise calorie estimate: sets × bodyweight factor.
function estExerciseCalories(sets, weightKg = 70) {
  if (!sets) return null;
  return Math.round((sets || 3) * (weightKg || 70) * 0.025);
}

// ── DayTitleEditor ────────────────────────────────────────────────────────────

function DayTitleEditor({ dayPlan, onSave }) {
  const focus = dayPlan?.focus || "";
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(focus);

  useEffect(() => { setVal(dayPlan?.focus || ""); }, [dayPlan?.focus]);

  function commit() {
    setEditing(false);
    const trimmed = val.trim();
    if (trimmed !== (dayPlan?.focus || "")) onSave(trimmed);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter")  commit();
          if (e.key === "Escape") { setEditing(false); setVal(dayPlan?.focus || ""); }
        }}
        placeholder="Add focus..."
        className="text-xs bg-transparent border-b border-blue-400 focus:outline-none text-gray-600 italic w-full"
      />
    );
  }

  return (
    <div className="flex items-start gap-1 group/title min-w-0">
      {focus ? (
        <span className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3">{focus}</span>
      ) : (
        <span className="text-sm text-gray-300 italic leading-snug">Add focus...</span>
      )}
      <button
        onClick={() => setEditing(true)}
        className="text-gray-300 hover:text-gray-500 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0 mt-0.5"
        title="Edit focus"
      >
        <SlidersHorizontal size={11} />
      </button>
    </div>
  );
}

// ── ExerciseCard ──────────────────────────────────────────────────────────────
// Simplified overview card — name, sets×reps pill, muscle tags, calorie estimate.

function ExerciseCard({ exercise, weightKg, hoveredMuscle, onClick, unit }) {
  const { primary, secondary } = getMusclesForExercise(exercise);
  // Normalize muscles for display in the compact overview cards
  const primaryNorm   = [...new Set(primary.map(normalizeMuscle))];
  const secondaryNorm = [...new Set(secondary.map(normalizeMuscle).filter((m) => !primaryNorm.includes(m)))];
  const allNorm = [...primaryNorm, ...secondaryNorm];
  const isHighlighted = hoveredMuscle && allNorm.includes(hoveredMuscle);
  const weightDisplay = exercise.weight != null
    ? ` · ${unit === "imperial"
        ? `${(exercise.weight * 2.20462).toFixed(1)} lbs`
        : `${exercise.weight} kg`}`
    : "";

  return (
    <div
      onClick={onClick}
      title="Click to edit"
      className={`p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all select-none overflow-hidden ${
        isHighlighted ? "ring-2 ring-blue-400 bg-blue-50" : ""
      }`}
    >
      <p className="font-semibold text-gray-800 text-xs leading-tight">{exercise.name}</p>
      <p className="text-xs text-gray-500 mt-0.5">
        {exercise.sets} × {exercise.reps}{weightDisplay}
      </p>
      {(primaryNorm.length > 0 || secondaryNorm.length > 0) && (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {primaryNorm.map((m) => (
            <span key={m} className={`text-xs px-1.5 py-0.5 rounded-full ${getMuscleColor(m)}`}>{m}</span>
          ))}
          {secondaryNorm.map((m) => (
            <span key={m} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">{m}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── HoverGapAdd ───────────────────────────────────────────────────────────────
// Invisible thin div between exercise cards that reveals a ➕ button on hover.

function HoverGapAdd({ onClick }) {
  return (
    <div
      className="group/gap flex items-center justify-center h-6 cursor-pointer"
      onClick={onClick}
    >
      <div className="h-px w-full bg-transparent group-hover/gap:bg-blue-200 transition-colors relative">
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-blue-400 opacity-0 group-hover/gap:opacity-100 transition-opacity rounded-full p-0.5 border border-blue-200 hover:text-blue-600 hover:border-blue-400 flex items-center justify-center">
          <Plus size={10} />
        </span>
      </div>
    </div>
  );
}

// ── ExerciseDetailModal ───────────────────────────────────────────────────────

function ExerciseDetailModal({ exercise, unit, weightKg, onSave, onRemove, onSwap, onClose }) {
  const [name,    setName]    = useState(exercise.name || "");
  const [sets,    setSets]    = useState(String(exercise.sets ?? "3"));
  const [reps,    setReps]    = useState(exercise.reps || "");
  const [weight,  setWeight]  = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Lock page scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const { primary, secondary } = getMusclesForExercise({ ...exercise, name });
  const kcal = estExerciseCalories(parseInt(sets) || 3, weightKg);

  // Initialise weight in the display unit.
  useEffect(() => {
    if (exercise.weight != null) {
      setWeight(
        unit === "imperial"
          ? String((exercise.weight * 2.20462).toFixed(1))
          : String(exercise.weight)
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    const updated = {
      ...exercise,
      name:  name.trim() || exercise.name,
      sets:  parseInt(sets)  || exercise.sets,
      reps:  reps             || exercise.reps,
      weight: weight !== ""
        ? (unit === "imperial" ? +(parseFloat(weight) / 2.20462).toFixed(2) : parseFloat(weight))
        : null,
    };
    onSave(updated);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-gray-900 text-lg">Exercise Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Exercise Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-lg font-semibold border-b border-gray-200 focus:border-blue-400 focus:outline-none pb-1 text-gray-900 bg-transparent"
            />
          </div>

          {/* Coaching tip */}
          {exercise.notes && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-600 mb-1">Coaching Tip</p>
              <p className="text-sm text-gray-700">{exercise.notes}</p>
            </div>
          )}

          {/* Muscles */}
          {(primary.length > 0 || secondary.length > 0) && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Muscles Activated</p>
              <div className="flex flex-wrap gap-1.5">
                {primary.map((m) => (
                  <span key={m} className={`text-xs px-2.5 py-1 rounded-full font-medium ${getMuscleColorByName(m)}`}>{m}</span>
                ))}
                {secondary.map((m) => (
                  <span key={m} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Sets / Reps / Weight */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Sets",            val: sets,   setter: setSets,   type: "number", placeholder: "3"   },
              { label: "Reps",            val: reps,   setter: setReps,   type: "text",   placeholder: "12"  },
              { label: `Weight (${unit === "imperial" ? "lbs" : "kg"})`, val: weight, setter: setWeight, type: "number", placeholder: "BW" },
            ].map(({ label, val, setter, type, placeholder }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  type={type}
                  step={type === "number" ? "0.5" : undefined}
                  min={type === "number" ? "0" : undefined}
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Calories estimate */}
          {kcal && (
            <p className="text-sm text-gray-400">
              ~<span className="font-medium text-gray-600">{kcal} kcal</span> estimated for this exercise
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onSwap}
              className="flex-1 py-2 border border-blue-500 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} /> Swap Exercise
            </button>
            {confirmRemove ? (
              <button
                onClick={onRemove}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Confirm Remove
              </button>
            ) : (
              <button
                onClick={() => setConfirmRemove(true)}
                className="py-2 px-3 border border-red-200 text-red-400 rounded-lg text-sm hover:bg-red-50 transition-colors flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RegenerateModal ───────────────────────────────────────────────────────────

function RegenerateModal({ onClose, onGenerate, isGenerating }) {
  const [disliked,       setDisliked]       = useState("");
  const [specific,       setSpecific]       = useState("");
  const [keepStructure,  setKeepStructure]  = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-gray-900">Let's improve your plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              What didn't you like about your current plan?{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={disliked}
              onChange={(e) => setDisliked(e.target.value)}
              placeholder="e.g. Too many leg days, meals were too complex…"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Any specific changes you want?{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={specific}
              onChange={(e) => setSpecific(e.target.value)}
              placeholder="e.g. More upper body, lower calorie meals, add HIIT sessions…"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Keep same workout days structure?</span>
            <button
              type="button"
              onClick={() => setKeepStructure((k) => !k)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                keepStructure ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                keepStructure ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          <button
            onClick={() => onGenerate({ dislikedFeedback: disliked, specificChanges: specific, keepStructure })}
            disabled={isGenerating}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </span>
            ) : (
              "Regenerate Plan →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SwapModal (exercise) ──────────────────────────────────────────────────────

function SwapModal({ mode, exercise, workoutFocus, profileWeight, onClose, onSelect }) {
  const [loading,     setLoading]     = useState(false);
  const [alts,        setAlts]        = useState([]);
  const [customText,  setCustomText]  = useState("");
  const [chosen,      setChosen]      = useState(null);

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
        exerciseName:  useCustom ? null : exercise?.name,
        primaryMuscle: exercise?.primary_muscles?.[0] || workoutFocus,
        userWeightKg:  profileWeight,
        customRequest: useCustom ? customText : undefined,
      });
      setAlts(data.alternatives || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-gray-900">
              {mode === "swap" ? `Swap: ${exercise?.name}` : "Add Exercise"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{workoutFocus}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex justify-center py-6">
              <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && alts.length > 0 && (
            <div className="space-y-2">
              {alts.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => setChosen(alt)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                    chosen === alt ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <p className="font-semibold text-gray-900 text-sm">{alt.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{alt.sets} sets × {alt.reps}</p>
                  {alt.primary_muscles?.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">{alt.primary_muscles.join(", ")}</p>
                  )}
                  {alt.notes && <p className="text-xs text-gray-400 italic mt-0.5">{alt.notes}</p>}
                </button>
              ))}
            </div>
          )}

          <div className={alts.length > 0 ? "border-t pt-4" : ""}>
            <p className="text-sm font-medium text-gray-700 mb-2">Request custom</p>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. 'something for home, no equipment'…"
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

// ── SwapMealModal ─────────────────────────────────────────────────────────────

function SwapMealModal({ mealType, mealData, profile, onClose, onSelect }) {
  const [loading,    setLoading]    = useState(false);
  const [alts,       setAlts]       = useState([]);
  const [chosen,     setChosen]     = useState(null);
  const [customText, setCustomText] = useState("");

  useEffect(() => { fetchAlts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAlts(useCustom = false) {
    setLoading(true);
    setAlts([]);
    setChosen(null);
    try {
      let restrictions = [];
      try {
        restrictions = Array.isArray(profile?.dietary_restrictions)
          ? profile.dietary_restrictions
          : profile?.dietary_restrictions ? JSON.parse(profile.dietary_restrictions) : [];
      } catch { restrictions = []; }

      const data = await swapMeal({
        mealType,
        dietType:      profile?.diet_type,
        calorieTarget: mealData?.calories,
        restrictions,
        customRequest: useCustom ? customText : undefined,
      });
      setAlts(data.alternatives || []);
    } catch { /* silent */ }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-gray-900">Swap {capitalize(mealType)}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{mealData?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex justify-center py-6">
              <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && alts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Swaps</p>
              {alts.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => setChosen(alt)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                    chosen === alt ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{alt.name}</p>
                    <span className="text-xs text-blue-600 font-medium shrink-0">{alt.calories} kcal</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {alt.ingredients?.slice(0, 4).join(", ")}{alt.ingredients?.length > 4 ? "…" : ""}
                  </p>
                  {alt.macros && (
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                      <span>P: {alt.macros.protein_g}g</span>
                      <span>C: {alt.macros.carbs_g}g</span>
                      <span>F: {alt.macros.fat_g}g</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className={alts.length > 0 ? "border-t pt-4" : ""}>
            <p className="text-sm font-medium text-gray-700 mb-2">Custom Request</p>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Describe what you'd like…"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
            />
            <button
              onClick={() => fetchAlts(true)}
              disabled={loading || !customText.trim()}
              className="w-full py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-40 transition-colors"
            >
              {loading ? "Getting suggestions…" : "Generate"}
            </button>
          </div>

          {chosen && (
            <button
              onClick={() => onSelect(chosen)}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Replace {capitalize(mealType)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SaveMealModal ─────────────────────────────────────────────────────────────

function SaveMealModal({ mealType, mealData, onClose, onSave }) {
  const [prepTime,   setPrepTime]   = useState("");
  const [cookTime,   setCookTime]   = useState("");
  const [servings,   setServings]   = useState("1");
  const [recipeUrl,  setRecipeUrl]  = useState("");
  const [saving,     setSaving]     = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        name: mealData.name, meal_type: mealType,
        ingredients: mealData.ingredients || [], macros: mealData.macros || null,
        prep_time_minutes: prepTime ? parseInt(prepTime) : null,
        cook_time_minutes: cookTime ? parseInt(cookTime) : null,
        servings: servings ? parseFloat(servings) : 1,
        external_recipe_url: recipeUrl || null,
      });
    } finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-gray-900">Save to My Meals</h2>
            <p className="text-xs text-gray-400 mt-0.5">{mealData?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-semibold text-gray-900 text-sm">{mealData?.name}</p>
            <p className="text-xs text-blue-600 mt-0.5">{mealData?.calories} kcal · {capitalize(mealType)}</p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{mealData?.ingredients?.join(", ")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[["Prep time (min)", prepTime, setPrepTime], ["Cook time (min)", cookTime, setCookTime]].map(([lbl, v, s]) => (
              <div key={lbl}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{lbl}</label>
                <input type="number" value={v} onChange={(e) => s(e.target.value)} placeholder="e.g. 10"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Servings</label>
            <input type="number" step="0.5" min="0.5" value={servings} onChange={(e) => setServings(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Recipe URL (optional)</label>
            <input type="url" value={recipeUrl} onChange={(e) => setRecipeUrl(e.target.value)} placeholder="https://…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : <span className="flex items-center justify-center gap-1.5"><Bookmark size={14} /> Save to My Meals</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AddCustomMealModal ────────────────────────────────────────────────────────

function AddCustomMealModal({ mealType, onClose, onAdd }) {
  const [name,         setName]         = useState("");
  const [calories,     setCalories]     = useState("");
  const [protein,      setProtein]      = useState("");
  const [carbs,        setCarbs]        = useState("");
  const [fat,          setFat]          = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredients,  setIngredients]  = useState([]);
  const [ingInput,     setIngInput]     = useState("");

  function addIngredient() {
    if (!ingInput.trim()) return;
    setIngredients((p) => [...p, ingInput.trim()]);
    setIngInput("");
  }

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      calories: parseInt(calories) || 0,
      ingredients,
      ...(instructions.trim() && { instructions: instructions.trim() }),
      ...((protein || carbs || fat) && {
        macros: { protein_g: parseInt(protein) || 0, carbs_g: parseInt(carbs) || 0, fat_g: parseInt(fat) || 0 },
      }),
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-gray-900">Add Custom {capitalize(mealType)}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Meal name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Avocado toast"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ingredients</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={ingInput} onChange={(e) => setIngInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIngredient(); } }}
                placeholder="Add ingredient…"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={addIngredient} className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">+</button>
            </div>
            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ingredients.map((ing, i) => (
                  <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                    {ing}
                    <button onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))} className="text-blue-400 hover:text-blue-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Calories</label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="e.g. 400"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[["Protein (g)", protein, setProtein], ["Carbs (g)", carbs, setCarbs], ["Fat (g)", fat, setFat]].map(([label, val, setter]) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type="number" value={val} onChange={(e) => setter(e.target.value)} placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Instructions (optional)</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="How to prepare…" rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <button onClick={handleAdd} disabled={!name.trim()}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            Add Meal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MuscleBreakdown ───────────────────────────────────────────────────────────

function MuscleBreakdown({ workoutPlan, hoveredMuscle, onMuscleHover }) {
  const [open, setOpen] = useState(false);
  const counts  = getMuscleBreakdown(workoutPlan);
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3"
      >
        Muscle Group Breakdown
        <span className="text-gray-400">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {open && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-400">No muscle data yet — muscles are derived automatically from exercise names.</p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">Hover a muscle to highlight matching exercises</p>
              <div className="flex flex-wrap gap-2">
                {entries.map(([muscle, count]) => (
                  <button
                    key={muscle}
                    onMouseEnter={() => onMuscleHover(muscle)}
                    onMouseLeave={() => onMuscleHover(null)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${getMuscleColor(muscle)} ${
                      hoveredMuscle === muscle ? "ring-2 ring-offset-1 ring-blue-400 scale-105" : "hover:scale-105"
                    }`}
                  >
                    {muscle} × {count}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Plan() {
  const [plan,            setPlan]            = useState(null);
  const [workoutPlan,     setWorkoutPlan]     = useState(null);
  const [mealPlan,        setMealPlan]        = useState(null);
  const [profile,         setProfile]         = useState(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isGenerating,    setIsGenerating]    = useState(false);
  const [savingStatus,    setSavingStatus]    = useState("idle"); // "idle"|"saving"|"saved"
  const [swapModal,       setSwapModal]       = useState(null);
  const [exerciseModal,   setExerciseModal]   = useState(null); // { day, idx, exercise }
  const [dayOverviewModal,setDayOverviewModal]= useState(null); // day string
  const [mealModal,       setMealModal]       = useState(null); // { type, mealType, mealData }
  const [showRegenModal,  setShowRegenModal]  = useState(false);
  const [hoveredMuscle,   setHoveredMuscle]   = useState(null);
  const { toast, showToast } = useToast();
  const location            = useLocation();
  const shouldAutoGenerate  = useRef(location.state?.autoGenerate === true);
  const saveTimer           = useRef(null);
  const mealSaveTimer       = useRef(null);

  const profileWeight = profile?.weight_kg || 70;
  const unit          = profile?.unit_preference || "metric";

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([getCurrentPlan(), getProfile().catch(() => null)])
      .then(([planData, profileData]) => {
        setPlan(planData);
        if (planData?.workout_plan) setWorkoutPlan(planData.workout_plan);
        if (planData?.meal_plan)    setMealPlan(planData.meal_plan);
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

  // ── Auto-save (workout) ────────────────────────────────────────────────────

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

  // ── Auto-save (meal) ───────────────────────────────────────────────────────

  const scheduleMealSave = useCallback((mp) => {
    clearTimeout(mealSaveTimer.current);
    mealSaveTimer.current = setTimeout(async () => {
      try { await patchMealPlan(mp); } catch { /* silent */ }
    }, 600);
  }, []);

  // ── Generate / Regenerate ─────────────────────────────────────────────────

  async function handleGenerate(feedback = null) {
    setIsGenerating(true);
    setShowRegenModal(false);
    try {
      const data = await generatePlan(feedback);
      setPlan(data);
      setWorkoutPlan(data.workout_plan);
      setMealPlan(data.meal_plan);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to generate plan.", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Workout mutations ─────────────────────────────────────────────────────

  function updateExercise(day, idx, updated) {
    const newWP = {
      ...workoutPlan,
      [day]: {
        ...workoutPlan[day],
        exercises: workoutPlan[day].exercises.map((ex, i) => (i === idx ? updated : ex)),
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

  function insertExercise(day, afterIdx, newEx) {
    const exercises = workoutPlan[day]?.exercises || [];
    const newExercises = [
      ...exercises.slice(0, afterIdx + 1),
      newEx,
      ...exercises.slice(afterIdx + 1),
    ];
    const newWP = { ...workoutPlan, [day]: { ...workoutPlan[day], exercises: newExercises } };
    setWorkoutPlan(newWP);
    scheduleAutoSave(newWP);
    setSwapModal(null);
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

  function updateDayFocus(day, focus) {
    const newWP = { ...workoutPlan, [day]: { ...workoutPlan[day], focus } };
    setWorkoutPlan(newWP);
    scheduleAutoSave(newWP);
  }

  // ── Meal mutations ────────────────────────────────────────────────────────

  function updateMealSlot(mealType, newMealData) {
    const newMP = { ...mealPlan, [mealType]: newMealData };
    setMealPlan(newMP);
    scheduleMealSave(newMP);
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────
  // Day-swap only (type="DAY"). Exercise reordering is done inside DayOverviewModal.

  function handleDragEnd({ source, destination }) {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Day swap — source and destination are day column droppableIds
    if (source.droppableId === destination.droppableId) return;
    const fromDay = source.droppableId;
    const toDay   = destination.droppableId;
    const newWP   = {
      ...workoutPlan,
      [fromDay]: workoutPlan[toDay] ?? null,
      [toDay]:   workoutPlan[fromDay],
    };
    setWorkoutPlan(newWP);
    scheduleAutoSave(newWP);
  }

  // ── Exercise modal helpers ────────────────────────────────────────────────

  function openSwapFromCard(day, idx, exercise, focus) {
    setExerciseModal(null);
    setSwapModal({ mode: "swap", day, exerciseIdx: idx, exercise, workoutFocus: focus });
  }

  function openAddExercise(day, afterIdx, focus) {
    setSwapModal({ mode: "add", day, insertAfterIdx: afterIdx, workoutFocus: focus });
  }

  function handleSwapModalSelect(newEx) {
    if (!swapModal) return;
    if (swapModal.mode === "swap") {
      replaceExercise(swapModal.day, swapModal.exerciseIdx, newEx);
    } else {
      insertExercise(swapModal.day, swapModal.insertAfterIdx, newEx);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const notes = plan?.notes;

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
          {savingStatus === "saved" && <span className="text-xs text-green-500 flex items-center gap-0.5"><Check size={12} /> Saved</span>}
        </div>
        <button
          onClick={() => plan ? setShowRegenModal(true) : handleGenerate()}
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
            No plan yet — click Generate My Plan to get started
          </p>
        </div>
      )}

      {plan && workoutPlan && (
        <div className="space-y-10">

          {/* ── Workout Plan ── */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Workout Plan</h2>
            <p className="text-xs text-gray-400 mb-4">
              Drag <GripVertical size={12} className="inline" /> to swap days · Click any exercise to edit · Click a day to view details
            </p>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-3">
                {DAYS.map((day) => {
                  const dayPlan = workoutPlan[day];
                  const kcal    = estCalories(dayPlan?.focus, dayPlan?.duration_minutes, profileWeight);

                  return (
                    <Droppable key={day} droppableId={day} type="DAY">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`shrink-0 w-52 rounded-xl border flex flex-col transition-colors ${
                            snapshot.isDraggingOver
                              ? "border-blue-400 bg-blue-50"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">
                            {DAY_LABELS[day]}
                          </p>

                          {dayPlan ? (
                            <Draggable draggableId={day} index={0}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`flex-1 flex flex-col px-2 pb-3 cursor-pointer ${
                                    dragSnapshot.isDragging ? "opacity-80" : ""
                                  }`}
                                  onClick={() => setDayOverviewModal(day)}
                                >
                                  {/* Day header: plain bold title left, drag handle right */}
                                  <div className="flex items-center justify-between mb-1 px-1">
                                    <span className="text-sm font-semibold text-gray-900 leading-snug flex-1 mr-1">
                                      {dayPlan.focus || "Workout"}
                                    </span>
                                    <span
                                      {...dragProvided.dragHandleProps}
                                      className="text-gray-300 hover:text-gray-500 select-none cursor-grab active:cursor-grabbing shrink-0"
                                      title="Drag to move this workout to another day"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <GripVertical size={14} />
                                    </span>
                                  </div>

                                  <p className="text-xs text-blue-600 mb-2 px-1">
                                    {dayPlan.duration_minutes} min
                                    {kcal ? ` · ~${kcal} kcal` : ""}
                                  </p>

                                  {/* Exercise list — static, no per-exercise DnD in overview */}
                                  <div className="flex-1">
                                    {(dayPlan.exercises || []).map((ex, idx) => (
                                      <div
                                        key={`${day}-ex-${idx}`}
                                        className="mb-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExerciseModal({ day, idx, exercise: ex });
                                        }}
                                      >
                                        <ExerciseCard
                                          exercise={ex}
                                          weightKg={profileWeight}
                                          hoveredMuscle={hoveredMuscle}
                                          unit={unit}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ) : (
                            <div className="flex-1 min-h-[80px] flex items-center justify-center gap-1.5 text-gray-300 text-sm pb-3">
                              <Moon size={16} /> Rest Day
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
          <MuscleBreakdown
            workoutPlan={workoutPlan}
            hoveredMuscle={hoveredMuscle}
            onMuscleHover={setHoveredMuscle}
          />

          {/* ── Meal Plan ── */}
          {mealPlan && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Meal Plan</h2>

              <div className="flex flex-wrap gap-2 mb-5">
                <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {mealPlan.dailyCalorieTarget} kcal / day
                </span>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                  Protein {mealPlan.macros?.protein_g}g
                </span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  Carbs {mealPlan.macros?.carbs_g}g
                </span>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                  Fat {mealPlan.macros?.fat_g}g
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {MEALS.map((meal) => {
                  const mealData = mealPlan[meal];
                  return (
                    <div key={meal} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        {capitalize(meal)}
                      </p>

                      {mealData ? (
                        <>
                          <p className="font-semibold text-gray-900 mb-1">{mealData.name}</p>
                          <p className="text-sm text-blue-600 mb-2">{mealData.calories} kcal</p>
                          {mealData.macros && (
                            <div className="flex gap-2 mb-2 text-xs text-gray-500">
                              <span>P: {mealData.macros.protein_g}g</span>
                              <span>C: {mealData.macros.carbs_g}g</span>
                              <span>F: {mealData.macros.fat_g}g</span>
                            </div>
                          )}
                          <ul className="space-y-0.5 mb-3 flex-1">
                            {mealData.ingredients?.map((ing, i) => (
                              <li key={i} className="text-sm text-gray-500">• {ing}</li>
                            ))}
                          </ul>
                          <div className="flex gap-2 mt-auto">
                            <button
                              onClick={() => setMealModal({ type: "swap", mealType: meal, mealData })}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              <RefreshCw size={12} /> Swap
                            </button>
                            <button
                              onClick={() => setMealModal({ type: "save", mealType: meal, mealData })}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              <Bookmark size={12} /> Save
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-300 mb-3">No meal set</p>
                      )}

                      <button
                        onClick={() => setMealModal({ type: "add", mealType: meal, mealData })}
                        className="mt-2 text-xs text-blue-500 hover:text-blue-700 text-left transition-colors"
                      >
                        + Add your own
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Coaching Notes ── */}
          {notes && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Coaching Notes</h2>
              <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-xl p-5 text-gray-700 leading-relaxed [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:mb-2 [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-1 [&_h3]:font-semibold [&_h3]:mb-1">
                <ReactMarkdown>{notes}</ReactMarkdown>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Regenerate Modal ── */}
      {showRegenModal && (
        <RegenerateModal
          onClose={() => setShowRegenModal(false)}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      )}

      {/* ── Day Overview Modal ── */}
      {dayOverviewModal && workoutPlan?.[dayOverviewModal] && (
        <DayOverviewModal
          day={dayOverviewModal}
          dayPlan={workoutPlan[dayOverviewModal]}
          profile={profile}
          onClose={() => setDayOverviewModal(null)}
          onUpdateDay={(day, updatedDayPlan) => {
            const newWP = { ...workoutPlan, [day]: updatedDayPlan };
            setWorkoutPlan(newWP);
            scheduleAutoSave(newWP);
          }}
          onRegenerateDaySuccess={(updated) => {
            if (updated?.workout_plan) {
              setWorkoutPlan(updated.workout_plan);
              setPlan(updated);
            }
          }}
        />
      )}

      {/* ── Exercise Detail Modal ── */}
      {exerciseModal && (
        <ExerciseDetailModal
          exercise={exerciseModal.exercise}
          unit={unit}
          weightKg={profileWeight}
          onClose={() => setExerciseModal(null)}
          onSave={(updated) => {
            updateExercise(exerciseModal.day, exerciseModal.idx, updated);
            setExerciseModal(null);
          }}
          onRemove={() => {
            removeExercise(exerciseModal.day, exerciseModal.idx);
            setExerciseModal(null);
          }}
          onSwap={() => openSwapFromCard(
            exerciseModal.day,
            exerciseModal.idx,
            exerciseModal.exercise,
            workoutPlan[exerciseModal.day]?.focus
          )}
        />
      )}

      {/* ── Exercise Swap / Add Modal ── */}
      {swapModal && (
        <SwapModal
          mode={swapModal.mode}
          exercise={swapModal.exercise}
          workoutFocus={swapModal.workoutFocus}
          profileWeight={profileWeight}
          onClose={() => setSwapModal(null)}
          onSelect={handleSwapModalSelect}
        />
      )}

      {/* ── Meal Modals ── */}
      {mealModal?.type === "swap" && (
        <SwapMealModal
          mealType={mealModal.mealType}
          mealData={mealModal.mealData}
          profile={profile}
          onClose={() => setMealModal(null)}
          onSelect={(newMeal) => { updateMealSlot(mealModal.mealType, newMeal); setMealModal(null); }}
        />
      )}

      {mealModal?.type === "save" && (
        <SaveMealModal
          mealType={mealModal.mealType}
          mealData={mealModal.mealData}
          onClose={() => setMealModal(null)}
          onSave={async (data) => {
            await saveToMyMeals(data);
            showToast("Saved to My Meals ✅", "success");
            setMealModal(null);
          }}
        />
      )}

      {mealModal?.type === "add" && (
        <AddCustomMealModal
          mealType={mealModal.mealType}
          onClose={() => setMealModal(null)}
          onAdd={(newMeal) => { updateMealSlot(mealModal.mealType, newMeal); setMealModal(null); }}
        />
      )}
    </div>
  );
}
