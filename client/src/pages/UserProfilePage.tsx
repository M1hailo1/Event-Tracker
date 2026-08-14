import { useState, useEffect } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { getUserById } from "../api/userApi";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from "../api/followApi";
import type { PublicUser, FollowUser } from "../types";
import { useAuth } from "../context/AuthContext";

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowActionLoading, setIsFollowActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadProfile(id);
  }, [id]);

  async function loadProfile(userId: string) {
    setIsLoading(true);
    try {
      const [profileData, followersData, followingData] = await Promise.all([
        getUserById(userId),
        getFollowers(userId),
        getFollowing(userId),
      ]);
      setProfile(profileData);
      setFollowers(followersData);
      setFollowing(followingData);
    } catch (err) {
      setError("Error loading profile");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const isFollowing = followers.some((f) => f.id === currentUser?.id);

  async function handleFollowToggle() {
    if (!id) return;
    setIsFollowActionLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(id);
      } else {
        await followUser(id);
      }
      await loadProfile(id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFollowActionLoading(false);
    }
  }

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!profile) return <p className="text-gray-500">User not found</p>;

  if (currentUser && currentUser.id === profile.id) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {profile.name}
              </h1>
              <p className="text-xs text-gray-400">
                Member since{" "}
                {new Date(profile.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
          </div>

          {currentUser && (
            <button
              onClick={handleFollowToggle}
              disabled={isFollowActionLoading}
              className={
                isFollowing
                  ? "bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  : "bg-indigo-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              }
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
