// Profile API helpers — fetch and update the authenticated user's health profile.

import apiClient from "./client";

export async function getProfile() {
  const response = await apiClient.get("/profile");
  return response.data;
}

export async function updateProfile(data) {
  const response = await apiClient.post("/profile", data);
  return response.data;
}
