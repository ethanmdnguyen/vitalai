// Dashboard API helper — fetches aggregated stats for the current user.

import apiClient from "./client";

export async function getDashboardData() {
  const response = await apiClient.get("/dashboard");
  return response.data;
}
