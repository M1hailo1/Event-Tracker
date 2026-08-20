import { useEffect, useState } from "react";
import { getFollowers } from "../api/followApi";
import { inviteUserToEvent, getEventInvites } from "../api/eventsApi";
import type { FollowUser } from "../types";

interface EventInviteManagerProps {
  eventId: string;
  creatorId: string;
}

export default function EventInviteManager({
  eventId,
  creatorId,
}: EventInviteManagerProps) {
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [invited, setInvited] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [followersData, invitedData] = await Promise.all([
          getFollowers(creatorId),
          getEventInvites(eventId),
        ]);
        setFollowers(followersData);
        setInvited(invitedData);
      } catch (err) {
        setError("Failed to load followers");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [eventId, creatorId]);

  async function handleInvite(userId: string) {
    setInvitingId(userId);
    setError("");
    try {
      await inviteUserToEvent(eventId, userId);
      const invitedUser = followers.find((f) => f.id === userId);
      if (invitedUser) {
        setInvited((prev) => [...prev, invitedUser]);
      }
    } catch (err) {
      setError("Failed to send invite");
      console.error(err);
    } finally {
      setInvitingId(null);
    }
  }

  const invitedIds = new Set(invited.map((u) => u.id));
  const invitableFollowers = followers.filter((f) => !invitedIds.has(f.id));

  if (isLoading) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Loading followers...
      </p>
    );
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Invite people
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        This event is invite-only. You can invite people who follow you.
      </p>

      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>
      )}

      {followers.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nobody follows you yet, so there's no one to invite.
        </p>
      ) : (
        <>
          {invitableFollowers.length > 0 && (
            <ul className="space-y-2 mb-3">
              {invitableFollowers.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-800 dark:text-gray-200">
                    {f.name}
                  </span>
                  <button
                    onClick={() => handleInvite(f.id)}
                    disabled={invitingId === f.id}
                    className="text-xs font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 disabled:opacity-50"
                  >
                    {invitingId === f.id ? "Inviting..." : "Invite"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {invited.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                Already invited
              </p>
              <ul className="flex flex-wrap gap-2">
                {invited.map((u) => (
                  <li
                    key={u.id}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full"
                  >
                    {u.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
