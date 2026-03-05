// Saved workouts API helpers — fetches user-saved workout templates.

import apiClient from "./client";

export async function getSavedWorkouts() {
  const response = await apiClient.get("/saved-workouts");
  return response.data;
}
