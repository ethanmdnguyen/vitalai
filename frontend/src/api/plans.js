// Plans API helpers — generate a new AI plan and fetch the current one.

import apiClient from "./client";

export async function generatePlan(feedback = null) {
  const response = await apiClient.post("/plans/generate", feedback ? { feedback } : {});
  return response.data;
}

export async function getCurrentPlan() {
  const response = await apiClient.get("/plans/current");
  return response.data;
}

export async function patchWorkoutPlan(workoutPlan) {
  const response = await apiClient.patch("/plans/current", { workoutPlan });
  return response.data;
}

export async function swapExercise(data) {
  const response = await apiClient.post("/plans/swap-exercise", data);
  return response.data;
}

export async function swapMeal(data) {
  const response = await apiClient.post("/plans/swap-meal", data);
  return response.data;
}

export async function patchMealPlan(mealPlan) {
  const response = await apiClient.patch("/plans/current", { mealPlan });
  return response.data;
}
