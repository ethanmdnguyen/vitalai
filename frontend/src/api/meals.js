// Meals API helpers — save, list, and delete meals from the My Meals library.

import apiClient from "./client";

export async function saveToMyMeals(data) {
  const response = await apiClient.post("/meals", data);
  return response.data;
}

export async function getMyMeals() {
  const response = await apiClient.get("/meals");
  return response.data;
}

export async function deleteMyMeal(id) {
  const response = await apiClient.delete(`/meals/${id}`);
  return response.data;
}
