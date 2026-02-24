// Plans API helpers — generate a new AI plan and fetch the current one.

import apiClient from "./client";

export async function generatePlan() {
  const response = await apiClient.post("/plans/generate");
  return response.data;
}

export async function getCurrentPlan() {
  const response = await apiClient.get("/plans/current");
  return response.data;
}
