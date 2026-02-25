// Settings page — 4 tabs: Profile, Diet & Restrictions, Preferences, Account.
// Pre-fills forms from the current profile. Saves to /api/profile on submit.
// Account tab: change-password, reset data, and delete account.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, updateProfile } from "../api/profile";
import {
  changePassword as changePasswordApi,
  deleteUserData,
  deleteUser,
} from "../api/settings";
import Toast, { useToast } from "../components/Toast";

// ── Constants ────────────────────────────────────────────────────────────────

const FITNESS_LEVELS = [
  { value: "beginner",     label: "Beginner",      desc: "New to structured exercise" },
  { value: "intermediate", label: "Intermediate",  desc: "Training for 1–3 years" },
  { value: "advanced",     label: "Advanced",      desc: "Training for 3+ years" },
];

const DIET_TYPES = [
  { value: "standard",       label: "Standard",        desc: "No restrictions" },
  { value: "vegetarian",     label: "Vegetarian",      desc: "No meat" },
  { value: "vegan",          label: "Vegan",            desc: "No animal products" },
  { value: "keto",           label: "Keto",             desc: "Very low carb, high fat" },
  { value: "paleo",          label: "Paleo",            desc: "Whole foods, no grains" },
  { value: "mediterranean",  label: "Mediterranean",   desc: "Fish, olive oil, veggies" },
];

const DIETARY_RESTRICTIONS = [
  "Gluten-free", "Dairy-free", "Nut-free", "Egg-free",
  "Soy-free", "Shellfish-free", "Low-sodium", "Low-sugar",
];

const WORKOUT_TYPES = [
  "Strength Training", "HIIT", "Cardio", "Yoga", "Pilates",
  "CrossFit", "Swimming", "Cycling", "Running", "Bodyweight",
  "Martial Arts", "Dance", "Sports", "Walking",
];

// ── Unit helpers ─────────────────────────────────────────────────────────────

function kgToLbs(kg) { return kg * 2.20462; }
function lbsToKg(lbs) { return lbs / 2.20462; }
function cmToFtIn(cm) {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inches = totalIn % 12;
  return { ft, inches };
}
function ftInToCm(ft, inches) { return (parseInt(ft) * 12 + parseFloat(inches || 0)) * 2.54; }

// ── Sub-components ────────────────────────────────────────────────────────────

function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        selected
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
      }`}
    >
      {label}
    </button>
  );
}

function Input({ label, type = "text", value, onChange, placeholder, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function DangerZoneSection({ title, description, confirmPlaceholder, confirmValue, onConfirmChange, buttonLabel, onAction, isDisabled }) {
  return (
    <div className="border border-red-200 rounded-xl p-5 bg-red-50">
      <h3 className="font-semibold text-red-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={confirmValue}
          onChange={(e) => onConfirmChange(e.target.value)}
          placeholder={confirmPlaceholder}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-40"
        />
        <button
          onClick={onAction}
          disabled={isDisabled}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS = ["Profile", "Diet & Restrictions", "Preferences", "Account"];

export default function Settings() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [activeTab, setActiveTab] = useState("Profile");
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ── Profile tab state ────────────────────────────────────────────────────
  const [unit, setUnit] = useState("metric");
  const [age, setAge] = useState("");
  const [weightDisplay, setWeightDisplay] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [workoutDays, setWorkoutDays] = useState("");
  const [workoutTypes, setWorkoutTypes] = useState([]);
  const [injuries, setInjuries] = useState("");

  // ── Diet tab state ───────────────────────────────────────────────────────
  const [dietType, setDietType] = useState("");
  const [restrictions, setRestrictions] = useState([]);
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [mealPrepDays, setMealPrepDays] = useState("");

  // ── Preferences tab state ────────────────────────────────────────────────
  const [prefUnit, setPrefUnit] = useState("metric");
  const [notifWorkout, setNotifWorkout] = useState(false);
  const [notifMeals, setNotifMeals] = useState(false);

  // ── Account tab state ────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [resetText, setResetText] = useState("");
  const [deleteText, setDeleteText] = useState("");

  // ── Load profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        prefillFromProfile(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    setPrefUnit(localStorage.getItem("unit_preference") || "metric");
    setNotifWorkout(localStorage.getItem("notif_workout") === "true");
    setNotifMeals(localStorage.getItem("notif_meals") === "true");
  }, []);

  function prefillFromProfile(data) {
    if (!data) return;
    const pref = data.unit_preference || "metric";
    setUnit(pref);

    setAge(data.age?.toString() || "");
    setBodyFat(data.body_fat_percent?.toString() || "");
    setFitnessLevel(data.fitness_level || "");
    setWorkoutDays(data.workout_days_per_week?.toString() || "");
    setWorkoutTypes(data.workout_types || []);
    setInjuries(data.injuries || "");

    if (pref === "imperial") {
      if (data.weight_kg) setWeightDisplay(kgToLbs(data.weight_kg).toFixed(1));
      if (data.height_cm) {
        const { ft, inches } = cmToFtIn(data.height_cm);
        setHeightFt(ft.toString());
        setHeightIn(inches.toFixed(0));
      }
    } else {
      if (data.weight_kg) setWeightDisplay(data.weight_kg.toString());
      if (data.height_cm) setHeightCm(data.height_cm.toString());
    }

    setDietType(data.diet_type || "");
    setRestrictions(data.dietary_restrictions || []);
    setDietaryNotes(data.dietary_notes || "");
    setMealPrepDays(data.meal_prep_days?.toString() || "");
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleUnitToggle() {
    const newUnit = unit === "metric" ? "imperial" : "metric";
    if (newUnit === "imperial") {
      if (weightDisplay) setWeightDisplay(kgToLbs(parseFloat(weightDisplay)).toFixed(1));
      if (heightCm) {
        const { ft, inches } = cmToFtIn(parseFloat(heightCm));
        setHeightFt(ft.toString());
        setHeightIn(inches.toFixed(0));
        setHeightCm("");
      }
    } else {
      if (weightDisplay) setWeightDisplay(lbsToKg(parseFloat(weightDisplay)).toFixed(1));
      if (heightFt || heightIn) {
        setHeightCm(ftInToCm(heightFt, heightIn).toFixed(1));
        setHeightFt("");
        setHeightIn("");
      }
    }
    setUnit(newUnit);
  }

  function buildPayload(overrides = {}) {
    let weight_kg, height_cm;
    if (unit === "imperial") {
      weight_kg = weightDisplay ? lbsToKg(parseFloat(weightDisplay)) : null;
      height_cm = (heightFt || heightIn) ? ftInToCm(heightFt, heightIn) : null;
    } else {
      weight_kg = weightDisplay ? parseFloat(weightDisplay) : null;
      height_cm = heightCm ? parseFloat(heightCm) : null;
    }

    return {
      // required fields — fall back to existing profile values
      age: parseInt(age) || profile?.age || null,
      weight_kg: weight_kg ?? profile?.weight_kg ?? null,
      height_cm: height_cm ?? profile?.height_cm ?? null,
      goal: profile?.goal || "general_fitness",
      diet_type: dietType || profile?.diet_type || "standard",
      workout_days_per_week: parseInt(workoutDays) || profile?.workout_days_per_week || 3,
      // v2 fields
      unit_preference: unit,
      fitness_level: fitnessLevel || null,
      body_fat_percent: bodyFat ? parseFloat(bodyFat) : null,
      injuries: injuries || null,
      workout_types: workoutTypes,
      dietary_restrictions: restrictions,
      dietary_notes: dietaryNotes || null,
      meal_prep_days: mealPrepDays ? parseInt(mealPrepDays) : null,
      primary_goal: profile?.primary_goal || null,
      secondary_goals: profile?.secondary_goals || [],
      goal_intensity: profile?.goal_intensity || null,
      event_type: profile?.event_type || null,
      event_date: profile?.event_date || null,
      event_name: profile?.event_name || null,
      ...overrides,
    };
  }

  async function handleSaveProfile() {
    setIsSaving(true);
    try {
      const updated = await updateProfile(buildPayload());
      setProfile(updated);
      showToast("Profile saved!", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to save profile.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveDiet() {
    setIsSaving(true);
    try {
      const updated = await updateProfile(
        buildPayload({ diet_type: dietType || profile?.diet_type || "standard" })
      );
      setProfile(updated);
      showToast("Diet preferences saved!", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to save preferences.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSavePreferences() {
    localStorage.setItem("unit_preference", prefUnit);
    localStorage.setItem("notif_workout", notifWorkout.toString());
    localStorage.setItem("notif_meals", notifMeals.toString());
    showToast("Preferences saved!", "success");
  }

  async function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      showToast("All password fields are required.", "error");
      return;
    }
    if (newPw !== confirmPw) {
      showToast("New passwords do not match.", "error");
      return;
    }
    setIsSaving(true);
    try {
      await changePasswordApi({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      showToast("Password changed successfully!", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to change password.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetData() {
    if (resetText !== "RESET") return;
    setIsSaving(true);
    try {
      await deleteUserData();
      setResetText("");
      showToast("All data has been reset.", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to reset data.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteText !== "DELETE") return;
    setIsSaving(true);
    try {
      await deleteUser();
      localStorage.clear();
      navigate("/login");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete account.", "error");
      setIsSaving(false);
    }
  }

  function toggleChip(list, setList, value) {
    setList((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <p className="text-gray-400 text-sm">Loading…</p>;
  }

  return (
    <div className="max-w-2xl">
      <Toast toast={toast} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === "Profile" && (
        <div className="space-y-6">
          {/* Unit toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Units:</span>
            <button
              type="button"
              onClick={handleUnitToggle}
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <span className={unit === "metric" ? "text-blue-600 font-semibold" : "text-gray-400"}>Metric</span>
              <span className="text-gray-300">|</span>
              <span className={unit === "imperial" ? "text-blue-600 font-semibold" : "text-gray-400"}>Imperial</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Age" type="number" value={age} onChange={setAge} placeholder="28" />
            <Input
              label={unit === "metric" ? "Weight (kg)" : "Weight (lbs)"}
              type="number"
              value={weightDisplay}
              onChange={setWeightDisplay}
              placeholder={unit === "metric" ? "75" : "165"}
            />
          </div>

          {unit === "metric" ? (
            <Input label="Height (cm)" type="number" value={heightCm} onChange={setHeightCm} placeholder="175" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Height (ft)" type="number" value={heightFt} onChange={setHeightFt} placeholder="5" />
              <Input label="Height (in)" type="number" value={heightIn} onChange={setHeightIn} placeholder="9" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Body Fat %" type="number" value={bodyFat} onChange={setBodyFat} placeholder="20" hint="Optional" />
            <Input label="Workout Days / Week" type="number" value={workoutDays} onChange={setWorkoutDays} placeholder="4" />
          </div>

          {/* Fitness level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fitness Level</label>
            <div className="grid grid-cols-3 gap-2">
              {FITNESS_LEVELS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFitnessLevel(value)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    fitnessLevel === value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <p className="font-medium text-sm text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Workout types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Workout Types</label>
            <div className="flex flex-wrap gap-2">
              {WORKOUT_TYPES.map((wt) => (
                <Chip
                  key={wt}
                  label={wt}
                  selected={workoutTypes.includes(wt)}
                  onClick={() => toggleChip(workoutTypes, setWorkoutTypes, wt)}
                />
              ))}
            </div>
          </div>

          {/* Injuries */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Injuries / Limitations</label>
            <textarea
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="E.g. bad knees, shoulder injury…"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      )}

      {/* ── Diet & Restrictions Tab ── */}
      {activeTab === "Diet & Restrictions" && (
        <div className="space-y-6">
          {/* Diet type cards */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Diet Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DIET_TYPES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDietType(value)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    dietType === value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <p className="font-medium text-sm text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Restrictions chips */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Restrictions</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_RESTRICTIONS.map((r) => (
                <Chip
                  key={r}
                  label={r}
                  selected={restrictions.includes(r)}
                  onClick={() => toggleChip(restrictions, setRestrictions, r)}
                />
              ))}
            </div>
          </div>

          {/* Dietary notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Notes</label>
            <textarea
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
              placeholder="Allergies, preferences, or anything else your AI chef should know…"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Meal prep days */}
          <Input
            label="Meal Prep Days / Week"
            type="number"
            value={mealPrepDays}
            onChange={setMealPrepDays}
            placeholder="2"
            hint="How many days are you willing to cook?"
          />

          <button
            onClick={handleSaveDiet}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving…" : "Save Diet Preferences"}
          </button>
        </div>
      )}

      {/* ── Preferences Tab ── */}
      {activeTab === "Preferences" && (
        <div className="space-y-6">
          {/* Unit preference */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Preferred Units</h2>
            <div className="flex gap-3">
              {["metric", "imperial"].map((u) => (
                <button
                  key={u}
                  onClick={() => setPrefUnit(u)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    prefUnit === u
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                  }`}
                >
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Notification toggles */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Notifications</h2>
            <div className="space-y-3">
              {[
                { key: "notifWorkout", label: "Workout reminders", value: notifWorkout, setter: setNotifWorkout },
                { key: "notifMeals",   label: "Meal reminders",    value: notifMeals,   setter: setNotifMeals   },
              ].map(({ key, label, value, setter }) => (
                <div key={key} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-700">{label}</span>
                  <button
                    onClick={() => setter(!value)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        value ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Notification preferences are stored locally on this device.</p>
          </div>

          <button
            onClick={handleSavePreferences}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Save Preferences
          </button>
        </div>
      )}

      {/* ── Account Tab ── */}
      {activeTab === "Account" && (
        <div className="space-y-8">
          {/* Change password */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-4">Change Password</h2>
            <div className="space-y-3 max-w-sm">
              <Input label="Current Password" type="password" value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
              <Input label="New Password" type="password" value={newPw} onChange={setNewPw} placeholder="••••••••" hint="At least 8 characters" />
              <Input label="Confirm New Password" type="password" value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" />
              <button
                onClick={handleChangePassword}
                disabled={isSaving}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Updating…" : "Update Password"}
              </button>
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <h2 className="text-base font-semibold text-red-700 mb-4">Danger Zone</h2>
            <div className="space-y-4">
              <DangerZoneSection
                title="Reset All Data"
                description="Deletes all your logs, plans, and reviews. Your account and profile stay. Type RESET to confirm."
                confirmPlaceholder="Type RESET"
                confirmValue={resetText}
                onConfirmChange={setResetText}
                buttonLabel="Reset Data"
                onAction={handleResetData}
                isDisabled={resetText !== "RESET" || isSaving}
              />
              <DangerZoneSection
                title="Delete Account"
                description="Permanently deletes your account and all associated data. This cannot be undone. Type DELETE to confirm."
                confirmPlaceholder="Type DELETE"
                confirmValue={deleteText}
                onConfirmChange={setDeleteText}
                buttonLabel="Delete Account"
                onAction={handleDeleteAccount}
                isDisabled={deleteText !== "DELETE" || isSaving}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
