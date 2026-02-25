// Axios HTTP client configured for the VitalAI API.
// Automatically attaches the JWT from localStorage to every outgoing request.

import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    // Use .set() — required for Axios v1.x AxiosHeaders internal serialization.
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

export default apiClient;
