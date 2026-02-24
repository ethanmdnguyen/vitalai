// useProfile — fetches the current user's profile from the API on mount.
// Returns { profile, loading, error }.

import { useState, useEffect } from "react";
import apiClient from "../api/client";

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient
      .get("/profile")
      .then((res) => setProfile(res.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  return { profile, loading, error };
}
