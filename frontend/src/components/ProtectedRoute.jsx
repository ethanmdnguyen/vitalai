// ProtectedRoute — redirects unauthenticated users to /login.
// Wrap any page that requires a valid JWT token with this component.

import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
