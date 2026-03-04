// Habits API helpers — log bad habits and fetch history.

import apiClient from "./client";

export async function logHabits(habits, logDate) {
  const payload = { habits };
  if (logDate) payload.logDate = logDate;
  const response = await apiClient.post("/habits", payload);
  return response.data;
}

export async function getHabitHistory() {
  const response = await apiClient.get("/habits");
  return response.data;
}
