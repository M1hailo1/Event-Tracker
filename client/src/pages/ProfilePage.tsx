import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyProfile, getMyStats } from "../api/userApi";
import type { UserProfile, UserStats } from "../types";
import { getTitleForCategory } from "../utils/categoryTitles";
import { getFollowers, getFollowing } from "../api/followApi";
import type { FollowUser } from "../types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);

  useEffect(() => {
    Promise.all([getMyProfile(), getMyStats()])
      .then(([profileData, statsData]) => {
        setProfile(profileData);
        setStats(statsData);
        return Promise.all([
          getFollowers(profileData.id),
          getFollowing(profileData.id),
        ]);
      })
      .then(([followersData, followingData]) => {
        setFollowers(followersData);
        setFollowing(followingData);
      })
      .catch((err) => {
        setError("Mistake while loading profile");
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-sm text-gray-500">{profile.email}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Member since {new Date(profile.createdAt).toLocaleDateString("en-GB")}
        </p>

        {stats && stats.topCategory && (
          <div className="mt-4 inline-block bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-2 rounded-full">
            {getTitleForCategory(stats.topCategory.name)}
          </div>
        )}
      </div>

      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Statistics
          </h2>

          <p className="text-3xl font-bold text-gray-900 mb-1">
            {stats.totalEvents}
          </p>
          <p className="text-sm text-gray-500 mb-5">attended events</p>

          {stats.categoryCounts.length > 0 && (
            <ul className="space-y-2">
              {stats.categoryCounts.map((c) => (
                <li
                  key={c.categoryId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">{c.name}</span>
                  <span className="font-medium text-gray-900">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{followers.length}</p>
          <p className="text-sm text-gray-500 mb-3">Followers</p>
          <ul className="space-y-1">
            {followers.map((f) => (
              <li key={f.id}>
                <Link
                  to={`/users/${f.id}`}
                  className="text-sm text-gray-700 hover:text-indigo-600"
                >
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{following.length}</p>
          <p className="text-sm text-gray-500 mb-3">Following</p>
          <ul className="space-y-1">
            {following.map((f) => (
              <li key={f.id}>
                <Link
                  to={`/users/${f.id}`}
                  className="text-sm text-gray-700 hover:text-indigo-600"
                >
                  {f.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
