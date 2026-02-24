// Layout — persistent shell with a left sidebar and main content area.
// Shown on all protected pages. Decodes the JWT to display the logged-in username.

import { NavLink, useNavigate } from "react-router-dom";

// Decode the JWT payload without a library (standard base64url → JSON).
function getUsernameFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return "User";
  try {
    const base64Payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64Payload));
    return payload.username || "User";
  } catch {
    return "User";
  }
}

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/plan",      label: "My Plan"   },
  { to: "/log",       label: "Log Today" },
  { to: "/progress",  label: "Progress"  },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const username = getUsernameFromToken();

  function handleLogout() {
    localStorage.clear();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* App name + username */}
        <div className="px-5 py-6 border-b border-gray-100">
          <p className="text-lg font-bold text-blue-600 mb-1">VitalAI</p>
          <p className="text-sm text-gray-500 truncate">{username}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
