import FollowLists from "../components/FollowLists";
import OrganizerEvents from "../components/OrganizerEvents";
import RatingDisplay from "../components/RatingDisplay";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { getMyProfile, getMyStats } from "../api/userApi";
import type { UserProfile, UserStats } from "../types";
import { getTitleForCategory } from "../utils/categoryTitles";
import { useTheme } from "../context/useTheme";
import { PageSkeleton } from "../components/Skeleton";

export default function ProfilePage() {
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getMyProfile(), getMyStats()])
      .then(([profileData, statsData]) => {
        setProfile(profileData);
        setStats(statsData);
      })
      .catch((err) => {
        setError("Mistake while loading profile");
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <PageSkeleton kind="profile" />;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!profile) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {profile.name}
              </h1>
              {profile.role !== "USER" && (
                <span className="text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full whitespace-nowrap">
                  {profile.role === "ADMIN" ? "Admin" : "Moderator"}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {profile.email}
            </p>
            <div className="mt-2"><RatingDisplay rating={profile.organizerRating} label="Organizer rating" /></div>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Member since {new Date(profile.createdAt).toLocaleDateString("en-GB")}
        </p>

        {stats && stats.topCategory && (
          <div className="mt-4 inline-block bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-sm font-medium px-4 py-2 rounded-full">
            {getTitleForCategory(stats.topCategory.name)}
          </div>
        )}
      </div>


      {stats && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Statistics
          </h2>

          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {stats.totalEvents}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            attended events
          </p>

          {stats.categoryCounts.length > 0 && (
            <ul className="space-y-2">
              {stats.categoryCounts.map((c) => (
                <li
                  key={c.categoryId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {c.name}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {c.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <FollowLists userId={profile.id} />

      <OrganizerEvents key={profile.id} userId={profile.id} name={profile.name} />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mt-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Settings
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Moon size={18} className="text-indigo-400" />
            ) : (
              <Sun size={18} className="text-indigo-600" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Dark mode
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Switch between light and dark theme
              </p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Toggle dark mode"
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
              theme === "dark" ? "bg-indigo-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
