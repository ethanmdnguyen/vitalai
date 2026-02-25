// ProtectedRoute — redirects unauthenticated users to /login.
// Also checks for a completed profile and redirects to /onboarding if none found.
//
// Caching strategy: module-level variables keyed by token string.
//   - Once a profile is confirmed (ok = true), skip the fetch on subsequent navigations.
//   - If no profile was found (ok = false), re-check next time so that completing
//     onboarding immediately un-gates the protected pages without a page reload.
//   - A new token value (different user or re-login) always triggers a fresh check.

import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import apiClient from "../api/client";

let _cachedToken = null;
let _profileOk = false;

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  // Derive initial status synchronously from the cache to avoid flicker on
  // repeated navigation between protected pages.
  const [status, setStatus] = useState(() => {
    if (!token) return "no-token";
    // Only trust the cache when the profile is confirmed present AND the token matches.
    if (token === _cachedToken && _profileOk) return "ok";
    return "checking";
  });

  useEffect(() => {
    if (status !== "checking") return;

    apiClient
      .get("/profile")
      .then(() => {
        _cachedToken = token;
        _profileOk = true;
        setStatus("ok");
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          // No profile yet — send to onboarding.
          _cachedToken = token;
          _profileOk = false;
          setStatus("no-profile");
        } else {
          // Network errors, 401 (expired token), 500, etc.
          // Fail open so a transient error doesn't permanently lock the user out;
          // the next real API call on the page will surface the error naturally.
          _cachedToken = token;
          _profileOk = true;
          setStatus("ok");
        }
      });
  }, [status, token]);

  if (status === "no-token") {
    return <Navigate to="/login" replace />;
  }

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "no-profile") {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
