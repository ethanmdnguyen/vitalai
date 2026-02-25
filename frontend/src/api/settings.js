// Settings API helpers — change password, delete data, delete account.

import apiClient from "./client";

export async function changePassword(data) {
  const response = await apiClient.post("/auth/change-password", data);
  return response.data;
}

export async function deleteUserData() {
  const response = await apiClient.delete("/user/data");
  return response.data;
}

export async function deleteUser() {
  const response = await apiClient.delete("/user");
  return response.data;
}
