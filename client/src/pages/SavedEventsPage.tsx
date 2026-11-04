import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEventPage } from "../api/eventsApi";
import type { Event } from "../types";
import Pagination, { type PageResult } from "../components/Pagination";
import EventCardGrid from "../components/EventCardGrid";
import { EventCardsSkeleton } from "../components/Skeleton";
import { useEventClock } from "../utils/eventLifecycle";
import { useAuth } from "../context/useAuth";
import { useSavedEvents } from "../context/useSavedEvents";

export default function SavedEventsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const viewerId = user?.id;
  const { revision } = useSavedEvents();
  const [past, setPast] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageResult<Event> | null>(null);
  const [completedRequest, setCompletedRequest] = useState("");
  const [requestError, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const clock = useEventClock(data?.items ?? []);
  const requestKey = JSON.stringify([viewerId, past, page, revision, retry, clock]);
  const loading = completedRequest !== requestKey;
  const error = loading ? "" : requestError;
  useEffect(() => {
    if (!viewerId) return;
    let active = true;
    getEventPage({ scope: "saved", includePast: past }, page).then(result => {
      if (!active) return;
      setError("");
      const last = Math.max(1, result.totalPages);
      if (page > last) setPage(last); else setData(result);
    }).catch(() => { if (active) setError("Unable to load saved events."); })
      .finally(() => { if (active) setCompletedRequest(requestKey); });
    return () => { active = false; };
  }, [viewerId, past, page, revision, retry, clock, requestKey]);
  if (authLoading && !user) return <EventCardsSkeleton />;
  if (!user) return <p className="text-gray-600 dark:text-gray-300"><Link className="text-indigo-600 dark:text-indigo-400" to="/login">Sign in</Link> to save events and view your list.</p>;
  return <div>
    <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">Saved events</h1>
    <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Your private wishlist. Saving an event doesn't reserve a place.</p>
    <div className="mb-5 flex flex-wrap gap-3">
      {[false, true].map(value => <button key={String(value)} aria-pressed={past === value}
        onClick={() => { setPast(value); setPage(1); }}
        className={`rounded-lg px-3 py-2 text-sm ${past === value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
        {value ? "History" : "Upcoming & ongoing"}
      </button>)}
    </div>
    {error ? <p role="alert" className="text-red-600 dark:text-red-400">{error} <button className="underline" onClick={() => setRetry(n => n + 1)}>Try again</button></p>
      : loading ? <EventCardsSkeleton /> : data?.items.length ? <EventCardGrid events={data.items} />
      : <div className="rounded-xl border border-gray-200 p-6 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
        <p className="mb-3">{past ? "No ended or cancelled saved events." : "You haven't saved any upcoming or ongoing events."}</p>
        <Link to="/" className="font-medium text-indigo-600 dark:text-indigo-400">Explore events</Link>
      </div>}
    {!error && <Pagination page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} disabled={loading} />}
  </div>;
}
