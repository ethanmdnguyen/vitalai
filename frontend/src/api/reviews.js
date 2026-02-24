// Reviews API helper — generates and fetches AI weekly reviews.

import apiClient from "./client";

export async function generateReview() {
  const response = await apiClient.post("/reviews/generate");
  return response.data;
}

export async function getReviews() {
  const response = await apiClient.get("/reviews");
  return response.data;
}
