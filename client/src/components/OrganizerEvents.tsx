import { useEffect, useState } from "react";
import { getEventPage } from "../api/eventsApi";
import type { Event } from "../types";
import Pagination, { type PageResult } from "./Pagination";
import EventCardGrid from "./EventCardGrid";
import { EventCardsSkeleton } from "./Skeleton";
import { useEventClock } from "../utils/eventLifecycle";
import { useAuth } from "../context/AuthContext";

export default function OrganizerEvents({ userId, name, refreshKey = 0 }: {
  userId: string;
  name: string;
  refreshKey?: number;
}) {
  const [past, setPast] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<Event> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const { user } = useAuth();
  const clock = useEventClock(data?.items ?? []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getEventPage({ organizerId: userId, includePast: past }, page)
      .then(result => {
        if (!active) return;
        if (page > Math.max(1, result.totalPages)) setPage(Math.max(1, result.totalPages));
        else setData(result);
      })
      .catch(() => { if (active) setError("Unable to load organized events."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, past, page, user?.id, refreshKey, clock, retry]);

  return (
    <section className="mb-6" aria-label="Organized events">
      <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">Events organized by {name}</h2>
      <div className="mb-4 flex gap-3">
        {[false, true].map(value => (
          <button key={String(value)} aria-pressed={past === value}
            className={`rounded-lg px-3 py-2 text-sm ${past === value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}
            onClick={() => { setPast(value); setPage(1); }}>
            {value ? "Past events" : "Upcoming & ongoing"}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert">{error} <button onClick={() => setRetry(n => n + 1)} className="text-indigo-600">Try again</button></p>
      ) : loading ? <EventCardsSkeleton /> : data?.items.length ? <EventCardGrid events={data.items} /> : (
        <p className="text-sm text-gray-500">No {past ? "past" : "upcoming or ongoing"} events to show.</p>
      )}
      {!error && <Pagination page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} disabled={loading} />}
    </section>
  );
}
