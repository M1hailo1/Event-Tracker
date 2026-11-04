import { useState } from "react";
import { inviteUserToEvent } from "../api/eventsApi";
import type { FollowUser } from "../types";
import { usePagedList } from "./usePagedList";
import { ListMore } from "./ListMore";

function InviteList({ eventId, kind, onInvited }: {
  eventId: string;
  kind: "available" | "invited";
  onInvited: () => void;
}) {
  const list = usePagedList<FollowUser>(`/events/${eventId}/invites?kind=${kind}`);
  const [inviting, setInviting] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function invite(id: string) {
    setInviting(id);
    setError("");
    try {
      await inviteUserToEvent(eventId, id);
      onInvited();
    } catch {
      setError("Unable to send invitation. Please try again.");
    } finally {
      setInviting(null);
    }
  }

  return (
    <div className="mt-3">
      <h4 className="mb-2 text-xs text-gray-500">{kind === "available" ? "Followers you can invite" : "Already invited"}</h4>
      <ul className="space-y-2">
        {list.items.map(item => (
          <li key={item.id} className="flex items-center justify-between gap-3 text-sm text-gray-800 dark:text-gray-200">
            <span className="break-words">{item.name}</span>
            {kind === "available" && (
              <button disabled={inviting !== null} onClick={() => invite(item.id)}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 disabled:opacity-50">
                {inviting === item.id ? "Inviting?" : "Invite"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {!list.busy && !list.error && !list.items.length && (
        <p className="text-sm text-gray-500">{kind === "available" ? "No more followers to invite." : "No invitations yet."}</p>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <ListMore {...list} onMore={list.loadMore} />
    </div>
  );
}

export default function EventInviteManager({ eventId }: { eventId: string; creatorId: string }) {
  const [refresh, setRefresh] = useState(0);
  const onInvited = () => setRefresh(n => n + 1);
  return (
    <section className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Invite people</h3>
      <p className="mt-2 text-xs text-gray-500">This event is invite-only. You can invite people who follow you.</p>
      <InviteList key={`available:${refresh}`} eventId={eventId} kind="available" onInvited={onInvited} />
      <InviteList key={`invited:${refresh}`} eventId={eventId} kind="invited" onInvited={onInvited} />
    </section>
  );
}
