// Grocery API helpers — generate, retrieve, toggle, uncheck-all, and clear grocery lists.

import apiClient from "./client";

export async function generateGroceryList() {
  const response = await apiClient.post("/grocery/generate");
  return response.data;
}

export async function getGroceryList() {
  const response = await apiClient.get("/grocery");
  return response.data;
}

export async function toggleGroceryItem(id) {
  const response = await apiClient.patch(`/grocery/${id}`);
  return response.data;
}

export async function uncheckAllItems() {
  const response = await apiClient.patch("/grocery");
  return response.data;
}

export async function clearGroceryList() {
  const response = await apiClient.delete("/grocery");
  return response.data;
}
