import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useAuth();

  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-bold text-indigo-600"
        >
          <CalendarDays size={30} />
          <span>EventTracker</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                to="/events/new"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Create event
              </Link>
              <Link
                to="/profile"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                My profile
              </Link>
              <span className="text-sm text-gray-500">Hello, {user.name}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
