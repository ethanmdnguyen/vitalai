// Onboarding wizard — collects health profile data across 3 steps and saves it to the API.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

const TOTAL_STEPS = 3;

const GOAL_OPTIONS = [
  { value: "lose_weight",   label: "Lose Weight" },
  { value: "build_muscle",  label: "Build Muscle" },
  { value: "maintain",      label: "Maintain Weight" },
];

const DIET_OPTIONS = [
  { value: "standard",     label: "Standard" },
  { value: "keto",         label: "Keto" },
  { value: "pescatarian",  label: "Pescatarian" },
  { value: "vegan",        label: "Vegan" },
  { value: "vegetarian",   label: "Vegetarian" },
  { value: "paleo",        label: "Paleo" },
];

const INITIAL_FORM = {
  age: "",
  weight_kg: "",
  height_cm: "",
  goal: "lose_weight",
  diet_type: "standard",
  workout_days_per_week: "",
  workout_preferences: "",
};

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleNext() {
    setError("");
    setCurrentStep((prev) => prev + 1);
  }

  function handleBack() {
    setError("");
    setCurrentStep((prev) => prev - 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await apiClient.post("/profile", {
        ...formData,
        age: Number(formData.age),
        weight_kg: parseFloat(formData.weight_kg),
        height_cm: Number(formData.height_cm),
        workout_days_per_week: Number(formData.workout_days_per_week),
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-lg p-8">

        {/* Progress indicator */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-2">Step {currentStep} of {TOTAL_STEPS}</p>
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < currentStep ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Step 1 — Your Body */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Body</h2>
            <p className="text-gray-500 text-sm mb-6">Help us understand your starting point.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min="10"
                  max="120"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 28"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  name="weight_kg"
                  value={formData.weight_kg}
                  onChange={handleChange}
                  min="20"
                  step="0.1"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 75.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                <input
                  type="number"
                  name="height_cm"
                  value={formData.height_cm}
                  onChange={handleChange}
                  min="100"
                  max="250"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 178"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Your Goals */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Goals</h2>
            <p className="text-gray-500 text-sm mb-6">Tell us what you're working towards.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Goal</label>
                <select
                  name="goal"
                  value={formData.goal}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {GOAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diet Type</label>
                <select
                  name="diet_type"
                  value={formData.diet_type}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {DIET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Your Workout Style */}
        {currentStep === 3 && (
          <form onSubmit={handleSubmit}>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Workout Style</h2>
            <p className="text-gray-500 text-sm mb-6">Let's personalise your training plan.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workout Days Per Week
                </label>
                <input
                  type="number"
                  name="workout_days_per_week"
                  value={formData.workout_days_per_week}
                  onChange={handleChange}
                  min="1"
                  max="7"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 4"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workout Preferences <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  name="workout_preferences"
                  value={formData.workout_preferences}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="e.g. I like HIIT, no running, I have dumbbells at home"
                />
              </div>
            </div>

            {/* Step 3 navigation */}
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : "Let's Go"}
              </button>
            </div>
          </form>
        )}

        {/* Step 1 & 2 navigation */}
        {currentStep < 3 && (
          <div className="flex gap-3 mt-8">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 font-medium"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
