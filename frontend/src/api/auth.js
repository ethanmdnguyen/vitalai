// Auth API helpers — wraps register and login endpoint calls.

import apiClient from "./client";

export async function register(data) {
  const response = await apiClient.post("/auth/register", data);
  return response.data;
}

export async function login(data) {
  const response = await apiClient.post("/auth/login", data);
  return response.data;
}
