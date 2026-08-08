import { useState, useEffect } from "react";
import { getMyProfile, getMyStats } from "../api/userApi";
import type { UserProfile, UserStats } from "../types";
import { getTitleForCategory } from "../utils/categoryTitles";

export default function ProfilePage() {
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

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!profile) return null;

  return (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.email}</p>
      <p>
        Member since: {new Date(profile.createdAt).toLocaleDateString("sr-RS")}
      </p>

      {stats && stats.topCategory && (
        <p>
          <strong>{getTitleForCategory(stats.topCategory.name)}</strong>
        </p>
      )}

      {stats && (
        <div>
          <h3>Statistics</h3>
          <p>Number of attended events: {stats.totalEvents}</p>
          <ul>
            {stats.categoryCounts.map((c) => (
              <li key={c.categoryId}>
                {c.name}: {c.count}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
