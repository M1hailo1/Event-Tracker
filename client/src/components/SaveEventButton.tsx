import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSavedEvents } from "../context/SavedEventsContext";

export default function SaveEventButton({ eventId, compact = false }: { eventId: string; compact?: boolean }) {
  const { user } = useAuth();
  const { ids, pending, loading, loadError, reload, toggle } = useSavedEvents();
  const [error, setError] = useState("");
  if (!user) return null;
  const saved = ids.has(eventId);
  const label = loadError ? "Retry loading saved events" : saved ? "Remove from saved events" : "Save event";
  return <div className="relative">
    <button type="button" aria-label={label} title={label} aria-pressed={saved}
      disabled={loading || pending.has(eventId)}
      onClick={async () => {
        setError("");
        if (loadError) { reload(); return; }
        try { await toggle(eventId); }
        catch { setError("Could not update saved event. Please try again."); }
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-sm font-medium shadow-sm hover:border-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 ${saved ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-300"}`}>
      <Bookmark size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
      {!compact && (pending.has(eventId) ? "Saving..." : loadError ? "Retry saved status" : saved ? "Saved" : "Save event")}
    </button>
    {error && <div role="alert" className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-red-200 bg-white p-2 text-xs text-red-700 shadow-md dark:bg-gray-900 dark:text-red-300">{error}</div>}
  </div>;
}
