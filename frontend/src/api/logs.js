// Logs API helpers — save today's log and fetch the current one.

import apiClient from "./client";

export async function saveLog(data) {
  const response = await apiClient.post("/logs", data);
  return response.data;
}

export async function getTodayLog() {
  const response = await apiClient.get("/logs/today");
  return response.data;
}

// Partial update of today's log — only touches the provided fields.
export async function patchTodayLog(fields) {
  const response = await apiClient.patch("/logs/today", fields);
  return response.data;
}
