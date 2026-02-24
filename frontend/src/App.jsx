// Root application component.
// Sets up React Router v6 with all top-level page routes.
// Protected routes are wrapped in ProtectedRoute (auth check) and Layout (sidebar shell).

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Plan from "./pages/Plan.jsx";
import Log from "./pages/Log.jsx";
import Progress from "./pages/Progress.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />

        <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/plan"      element={<ProtectedLayout><Plan /></ProtectedLayout>} />
        <Route path="/log"       element={<ProtectedLayout><Log /></ProtectedLayout>} />
        <Route path="/progress"  element={<ProtectedLayout><Progress /></ProtectedLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
