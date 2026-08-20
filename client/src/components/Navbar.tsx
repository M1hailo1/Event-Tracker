import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setIsMenuOpen(false);
    navigate("/");
  }

  function handleLinkClick() {
    setIsMenuOpen(false);
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-bold text-indigo-600"
          onClick={handleLinkClick}
        >
          <CalendarDays size={30} />
          <span>EventTracker</span>
        </Link>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <NotificationBell />
              <Link
                to="/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Dashboard
              </Link>
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
              {user.role === "ADMIN" && (
                <Link
                  to="/admin"
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600"
                >
                  Admin
                </Link>
              )}
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

        <div className="md:hidden flex items-center gap-4">
          {user && <NotificationBell />}
          <button
            className="text-gray-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden max-w-5xl mx-auto mt-4 flex flex-col gap-3 pb-2">
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={handleLinkClick}
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Dashboard
              </Link>
              <Link
                to="/events/new"
                onClick={handleLinkClick}
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Create event
              </Link>
              <Link
                to="/profile"
                onClick={handleLinkClick}
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                My profile
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  to="/admin"
                  onClick={handleLinkClick}
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-red-600 hover:text-red-700 text-left"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={handleLinkClick}
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={handleLinkClick}
                className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 inline-block w-fit"
              >
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
