// Onboarding wizard — 6-step profile setup.
// Step 3 is conditional: only shown for "Lose Body Fat" or "Train for a Specific Event".
// Metric values are always stored in the DB; imperial inputs are converted on submit.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import Toast, { useToast } from "../components/Toast";

// ── Constants ────────────────────────────────────────────────────────────────────

const GOALS = [
  { value: "lose_body_fat",     icon: "🔥", label: "Lose Body Fat",                  benefit: "Burn fat while preserving muscle" },
  { value: "build_muscle",      icon: "💪", label: "Build Muscle",                   benefit: "Gain lean mass and improve strength" },
  { value: "improve_fitness",   icon: "🏃", label: "Improve Fitness & Endurance",    benefit: "Run farther, breathe easier, last longer" },
  { value: "increase_strength", icon: "🏋️", label: "Increase Strength",              benefit: "Lift heavier and feel more powerful" },
  { value: "improve_health",    icon: "❤️", label: "Improve Health & Longevity",     benefit: "Build habits that add years to your life" },
  { value: "boost_energy",      icon: "⚡", label: "Boost Energy & Wellness",        benefit: "Feel better every single day" },
  { value: "improve_mobility",  icon: "🧘", label: "Improve Mobility & Flexibility", benefit: "Move freely, recover faster, prevent injury" },
  { value: "train_for_event",   icon: "🎯", label: "Train for a Specific Event",     benefit: "Prepare for a race, competition, or challenge" },
];

const PACE_OPTIONS = [
  { value: "sustainable", icon: "🐢", label: "Sustainable", desc: "Slow and steady, ~0.25kg/week. Best for long-term success." },
  { value: "moderate",    icon: "🚶", label: "Moderate",    desc: "Steady progress, ~0.5kg/week. Balanced approach." },
  { value: "aggressive",  icon: "🔥", label: "Aggressive",  desc: "Fast results, ~0.75–1kg/week. Requires strict adherence." },
];

const EVENT_TYPES = [
  "Marathon", "Triathlon", "Powerlifting Meet", "Bodybuilding Competition",
  "Obstacle Race", "Cycling Event", "Other",
];

const FITNESS_LEVELS = [
  { value: "beginner",     label: "Beginner",     desc: "New to structured training" },
  { value: "intermediate", label: "Intermediate", desc: "Training consistently for 6+ months" },
  { value: "advanced",     label: "Advanced",     desc: "Training seriously for 2+ years" },
];

const DIET_TYPES = [
  { value: "standard",    icon: "🍽️", label: "Standard" },
  { value: "keto",        icon: "🥑", label: "Keto" },
  { value: "pescatarian", icon: "🐟", label: "Pescatarian" },
  { value: "vegetarian",  icon: "🥦", label: "Vegetarian" },
  { value: "vegan",       icon: "🌱", label: "Vegan" },
  { value: "paleo",       icon: "🍖", label: "Paleo" },
];

const DIETARY_RESTRICTIONS = [
  "Gluten-Free", "Dairy-Free", "Nut Allergy", "Shellfish Allergy",
  "Egg-Free", "Soy-Free", "Halal", "Kosher",
];

const WORKOUT_TYPES = [
  "Weightlifting", "HIIT", "Running", "Swimming", "Cycling", "Yoga",
  "Pilates", "Calisthenics", "CrossFit", "Sports", "Walking", "Dance",
  "Martial Arts", "Rock Climbing",
];

// ── Unit conversion helpers ───────────────────────────────────────────────────────

function kgToLbs(kg)   { return kg  ? (Number(kg)  * 2.20462).toFixed(1) : ""; }
function lbsToKg(lbs)  { return lbs ? (Number(lbs) / 2.20462).toFixed(1) : ""; }
function cmToFtIn(cm) {
  if (!cm) return { ft: "", in: "" };
  const totalIn = Number(cm) / 2.54;
  return { ft: String(Math.floor(totalIn / 12)), in: String(Math.round(totalIn % 12)) };
}
function ftInToCm(ft, inches) {
  if (!ft && !inches) return "";
  return String(Math.round((Number(ft || 0) * 12 + Number(inches || 0)) * 2.54));
}

// ── Reusable sub-components ───────────────────────────────────────────────────────

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        selected
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

function Input({ label, hint, tooltip, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {hint && <span className="text-gray-400 font-normal ml-1">{hint}</span>}
        {tooltip && (
          <span title={tooltip} className="ml-1 cursor-help text-gray-400 text-xs">ⓘ</span>
        )}
      </label>
      <input
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      />
    </div>
  );
}

// ── Initial form state ────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  primaryGoal: "",
  secondaryGoals: [],
  goalIntensity: "",
  eventType: "",
  eventDate: "",
  eventName: "",
  unitPreference: "metric",
  weight_kg: "",
  weight_lbs: "",
  height_cm: "",
  height_ft: "",
  height_in: "",
  age: "",
  bodyFatPercent: "",
  fitnessLevel: "",
  injuries: "",
  dietType: "standard",
  dietaryRestrictions: [],
  dietaryNotes: "",
  workoutDaysPerWeek: "",
  workoutTypes: [],
  workoutPreferences: "",
};

// ── Main component ────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const { toast, showToast } = useToast();
  const navigate = useNavigate();

  // Step 3 is only shown for these two primary goals.
  const needsStep3 =
    formData.primaryGoal === "lose_body_fat" ||
    formData.primaryGoal === "train_for_event";

  const totalDisplaySteps = needsStep3 ? 6 : 5;
  // Adjust displayed step number when step 3 is skipped.
  const displayStep = !needsStep3 && currentStep > 3 ? currentStep - 1 : currentStep;

  // ── Helpers ──

  function update(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setStepError("");
  }

  function selectPrimaryGoal(value) {
    setFormData((prev) => ({
      ...prev,
      primaryGoal: value,
      secondaryGoals: prev.secondaryGoals.filter((g) => g !== value),
    }));
    setStepError("");
  }

  function toggleSecondaryGoal(value) {
    setFormData((prev) => {
      const cur = prev.secondaryGoals;
      if (cur.includes(value)) return { ...prev, secondaryGoals: cur.filter((g) => g !== value) };
      if (cur.length >= 2) return prev;
      return { ...prev, secondaryGoals: [...cur, value] };
    });
  }

  function toggleChip(field, value) {
    setFormData((prev) => {
      const cur = prev[field];
      return {
        ...prev,
        [field]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      };
    });
  }

  function handleUnitToggle(unit) {
    if (unit === formData.unitPreference) return;
    setFormData((prev) => {
      const updates = { ...prev, unitPreference: unit };
      if (unit === "imperial") {
        if (prev.weight_kg) updates.weight_lbs = kgToLbs(prev.weight_kg);
        if (prev.height_cm) {
          const { ft, in: ins } = cmToFtIn(prev.height_cm);
          updates.height_ft = ft;
          updates.height_in = ins;
        }
      } else {
        if (prev.weight_lbs) updates.weight_kg = lbsToKg(prev.weight_lbs);
        if (prev.height_ft || prev.height_in) {
          updates.height_cm = ftInToCm(prev.height_ft, prev.height_in);
        }
      }
      return updates;
    });
  }

  // ── Validation ──

  function validateStep() {
    const imperial = formData.unitPreference === "imperial";
    switch (currentStep) {
      case 1:
        if (!formData.primaryGoal) {
          setStepError("Please select your primary goal to continue.");
          return false;
        }
        break;
      case 3:
        if (formData.primaryGoal === "lose_body_fat" && !formData.goalIntensity) {
          setStepError("Please select your preferred pace.");
          return false;
        }
        if (formData.primaryGoal === "train_for_event" && !formData.eventType) {
          setStepError("Please select your event type.");
          return false;
        }
        break;
      case 4:
        if (!formData.age) { setStepError("Age is required."); return false; }
        if (imperial && !formData.weight_lbs) { setStepError("Weight is required."); return false; }
        if (!imperial && !formData.weight_kg)  { setStepError("Weight is required."); return false; }
        if (imperial && !formData.height_ft)   { setStepError("Height is required."); return false; }
        if (!imperial && !formData.height_cm)  { setStepError("Height is required."); return false; }
        if (!formData.fitnessLevel) { setStepError("Please select your fitness level."); return false; }
        break;
      case 5:
        if (!formData.dietType) { setStepError("Please select a diet type."); return false; }
        break;
      case 6:
        if (!formData.workoutDaysPerWeek) {
          setStepError("Please select how many days per week you want to work out.");
          return false;
        }
        break;
    }
    return true;
  }

  // ── Navigation ──

  function handleNext() {
    if (!validateStep()) return;
    setStepError("");
    if (currentStep === 2 && !needsStep3) {
      setCurrentStep(4);
    } else {
      setCurrentStep((p) => p + 1);
    }
    window.scrollTo(0, 0);
  }

  function handleBack() {
    setStepError("");
    if (currentStep === 4 && !needsStep3) {
      setCurrentStep(2);
    } else {
      setCurrentStep((p) => p - 1);
    }
    window.scrollTo(0, 0);
  }

  // ── Submit ──

  async function handleSubmit() {
    if (!validateStep()) return;

    // Guard against a missing session — this happens if the user navigates
    // directly to /onboarding without registering, or if localStorage was cleared.
    if (!localStorage.getItem("token")) {
      showToast("Session expired. Please log in or register again.", "error");
      return;
    }

    setIsSubmitting(true);

    const imperial = formData.unitPreference === "imperial";
    const finalWeightKg = imperial ? lbsToKg(formData.weight_lbs) : formData.weight_kg;
    const finalHeightCm = imperial
      ? ftInToCm(formData.height_ft, formData.height_in)
      : formData.height_cm;

    try {
      await apiClient.post("/profile", {
        // Required v1 fields
        age:                  Number(formData.age),
        weight_kg:            parseFloat(finalWeightKg),
        height_cm:            Number(finalHeightCm),
        goal:                 formData.primaryGoal,
        diet_type:            formData.dietType,
        workout_days_per_week: Number(formData.workoutDaysPerWeek),
        workout_preferences:  formData.workoutPreferences || null,
        // v2 fields
        unit_preference:      formData.unitPreference,
        fitness_level:        formData.fitnessLevel || null,
        body_fat_percent:     formData.bodyFatPercent ? parseFloat(formData.bodyFatPercent) : null,
        injuries:             formData.injuries || null,
        workout_types:        formData.workoutTypes,
        dietary_restrictions: formData.dietaryRestrictions,
        dietary_notes:        formData.dietaryNotes || null,
        primary_goal:         formData.primaryGoal,
        secondary_goals:      formData.secondaryGoals,
        goal_intensity:
          formData.primaryGoal === "lose_body_fat" ? (formData.goalIntensity || null) : null,
        event_type:
          formData.primaryGoal === "train_for_event" ? (formData.eventType || null) : null,
        event_date:
          formData.primaryGoal === "train_for_event" && formData.eventDate
            ? formData.eventDate : null,
        event_name:
          formData.primaryGoal === "train_for_event" ? (formData.eventName || null) : null,
      });
      navigate("/plan", { state: { autoGenerate: true } });
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to save profile. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Step content ──────────────────────────────────────────────────────────────

  const secondaryGoalOptions = GOALS.filter((g) => g.value !== formData.primaryGoal);

  const stepContent = {
    1: (
      <>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">What's your main goal?</h2>
        <p className="text-gray-500 text-sm mb-6">We'll build everything around this.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GOALS.map((g) => {
            const selected = formData.primaryGoal === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => selectPrimaryGoal(g.value)}
                className={`relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {selected && (
                  <span className="absolute top-2 right-2 text-blue-600 text-xs font-bold">✓</span>
                )}
                <span className="text-3xl mb-2">{g.icon}</span>
                <span className={`text-xs font-semibold leading-tight mb-1 ${selected ? "text-blue-700" : "text-gray-900"}`}>
                  {g.label}
                </span>
                <span className="text-xs text-gray-400 leading-tight">{g.benefit}</span>
              </button>
            );
          })}
        </div>
      </>
    ),

    2: (
      <>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Any other goals?</h2>
        <p className="text-gray-500 text-sm mb-6">
          Pick up to 2 — we'll weave these into your plan too.{" "}
          <span className="text-gray-400">(Optional)</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {secondaryGoalOptions.map((g) => {
            const selected = formData.secondaryGoals.includes(g.value);
            const maxReached = formData.secondaryGoals.length >= 2 && !selected;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => toggleSecondaryGoal(g.value)}
                disabled={maxReached}
                className={`relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-blue-600 bg-blue-50"
                    : maxReached
                    ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {selected && (
                  <span className="absolute top-2 right-2 text-blue-600 text-xs font-bold">✓</span>
                )}
                <span className="text-3xl mb-2">{g.icon}</span>
                <span className={`text-xs font-semibold leading-tight mb-1 ${selected ? "text-blue-700" : "text-gray-900"}`}>
                  {g.label}
                </span>
                <span className="text-xs text-gray-400 leading-tight">{g.benefit}</span>
              </button>
            );
          })}
        </div>
        {formData.secondaryGoals.length > 0 && (
          <p className="text-xs text-blue-600 mt-3">
            {formData.secondaryGoals.length}/2 selected
          </p>
        )}
      </>
    ),

    3: formData.primaryGoal === "lose_body_fat" ? (
      <>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">How aggressive do you want to go?</h2>
        <p className="text-gray-500 text-sm mb-6">Choose the pace that fits your lifestyle.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PACE_OPTIONS.map((p) => {
            const selected = formData.goalIntensity === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => update("goalIntensity", p.value)}
                className={`flex flex-col items-center text-center p-5 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <span className="text-4xl mb-3">{p.icon}</span>
                <span className={`font-semibold mb-2 ${selected ? "text-blue-700" : "text-gray-900"}`}>
                  {p.label}
                </span>
                <span className="text-xs text-gray-500 leading-relaxed">{p.desc}</span>
              </button>
            );
          })}
        </div>
      </>
    ) : (
      <>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Tell us about your event</h2>
        <p className="text-gray-500 text-sm mb-6">We'll periodize your training around it.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.eventType}
              onChange={(e) => update("eventType", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select your event type…</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <Input
            label="Event date"
            hint="(optional)"
            type="date"
            value={formData.eventDate}
            onChange={(e) => update("eventDate", e.target.value)}
          />
          <Input
            label="Event name"
            hint="(optional)"
            type="text"
            placeholder="e.g. LA Marathon 2026"
            value={formData.eventName}
            onChange={(e) => update("eventName", e.target.value)}
          />
        </div>
      </>
    ),

    4: (
      <>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Body</h2>
        <p className="text-gray-500 text-sm mb-6">This helps us calibrate your plan accurately.</p>

        {/* Unit toggle */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-500 mr-1">Units:</span>
          {["metric", "imperial"].map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => handleUnitToggle(unit)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                formData.unitPreference === unit
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              }`}
            >
              {unit === "metric" ? "Metric (kg / cm)" : "Imperial (lbs / ft)"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Weight */}
          {formData.unitPreference === "metric" ? (
            <Input
              label="Weight"
              hint="(kg)"
              type="number"
              step="0.1"
              min="20"
              placeholder="e.g. 75.5"
              value={formData.weight_kg}
              onChange={(e) => update("weight_kg", e.target.value)}
            />
          ) : (
            <Input
              label="Weight"
              hint="(lbs)"
              type="number"
              step="0.1"
              min="44"
              placeholder="e.g. 166"
              value={formData.weight_lbs}
              onChange={(e) => update("weight_lbs", e.target.value)}
            />
          )}

          {/* Height */}
          {formData.unitPreference === "metric" ? (
            <Input
              label="Height"
              hint="(cm)"
              type="number"
              min="100"
              max="250"
              placeholder="e.g. 178"
              value={formData.height_cm}
              onChange={(e) => update("height_cm", e.target.value)}
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="3"
                    max="8"
                    placeholder="ft"
                    value={formData.height_ft}
                    onChange={(e) => update("height_ft", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="11"
                    placeholder="in"
                    value={formData.height_in}
                    onChange={(e) => update("height_in", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <Input
            label="Age"
            type="number"
            min="10"
            max="120"
            placeholder="e.g. 28"
            value={formData.age}
            onChange={(e) => update("age", e.target.value)}
          />

          <Input
            label="Body fat %"
            hint="(optional)"
            tooltip="Find this with a body composition scale or estimate at a gym"
            type="number"
            step="0.1"
            min="3"
            max="60"
            placeholder="e.g. 18"
            value={formData.bodyFatPercent}
            onChange={(e) => update("bodyFatPercent", e.target.value)}
          />

          {/* Fitness level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fitness level</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FITNESS_LEVELS.map((f) => {
                const selected = formData.fitnessLevel === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => update("fitnessLevel", f.value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <p className={`font-semibold text-sm ${selected ? "text-blue-700" : "text-gray-900"}`}>
                      {f.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Injuries or physical limitations{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. bad left knee, lower back pain"
              value={formData.injuries}
              onChange={(e) => update("injuries", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </>
    ),

    5: (
      <>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Diet</h2>
        <p className="text-gray-500 text-sm mb-6">We'll build meals around your preferences.</p>

        {/* Diet type cards */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Diet type</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {DIET_TYPES.map((d) => {
              const selected = formData.dietType === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => update("dietType", d.value)}
                  className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${
                    selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl mb-1">{d.icon}</span>
                  <span className={`text-xs font-medium ${selected ? "text-blue-700" : "text-gray-700"}`}>
                    {d.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary restriction tags */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dietary restrictions{" "}
            <span className="text-gray-400 font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_RESTRICTIONS.map((r) => (
              <Chip
                key={r}
                label={r}
                selected={formData.dietaryRestrictions.includes(r)}
                onClick={() => toggleChip("dietaryRestrictions", r)}
              />
            ))}
          </div>
        </div>

        {/* Dietary notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Anything else?{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Foods you hate, cultural preferences, allergies not listed above…"
            value={formData.dietaryNotes}
            onChange={(e) => update("dietaryNotes", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </>
    ),

    6: (
      <>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Workout Style</h2>
        <p className="text-gray-500 text-sm mb-6">Last step — let's shape your training plan.</p>

        {/* Workout days per week */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workout days per week
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => {
              const selected = formData.workoutDaysPerWeek === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => update("workoutDaysPerWeek", n)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                    selected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workout type tags */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workout types{" "}
            <span className="text-gray-400 font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {WORKOUT_TYPES.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={formData.workoutTypes.includes(t)}
                onClick={() => toggleChip("workoutTypes", t)}
              />
            ))}
          </div>
        </div>

        {/* Additional preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional preferences{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Equipment available, things you love or hate, time constraints, anything else…"
            value={formData.workoutPreferences}
            onChange={(e) => update("workoutPreferences", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </>
    ),
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-10">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${(displayStep / totalDisplaySteps) * 100}%` }}
          />
        </div>

        <div className="p-8">
          <Toast toast={toast} />

          {/* Step indicator */}
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-4">
            Step {displayStep} of {totalDisplaySteps}
          </p>

          {/* Step content */}
          {stepContent[currentStep]}

          {/* Error message */}
          {stepError && (
            <p className="text-red-600 text-sm mt-4 font-medium">{stepError}</p>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
            )}

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="ml-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="ml-auto flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  "Build My Profile →"
                )}
              </button>
            )}

            {/* Skip link for step 2 */}
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => {
                  setFormData((p) => ({ ...p, secondaryGoals: [] }));
                  handleNext();
                }}
                className="text-sm text-gray-400 hover:text-gray-600 underline"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
