import { useEffect, useState } from "react";
import { auditActions, getAuditHistory, type AuditEntry } from "../api/adminApi";
import Pagination from "./Pagination";
import LoadingBlock from "./LoadingBlock";
import { formatEventDate } from "../utils/formatDate";

const inputClass = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";

const detailLabels: Record<string, string> = {
  bannedUntil: "Banned until", banReason: "Ban reason", categoryId: "Primary category ID",
  eventId: "Event ID", authorId: "Author ID", commentId: "Comment ID", organizerId: "Organizer ID",
  reviewedReportCount: "Reports reviewed", cancelledEventIds: "Cancelled event IDs",
  seriesEventIds: "Series event IDs", stoppedSeries: "Series stopped", ownedEventIds: "Organized event IDs",
};

function DetailValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null) return <span className="text-gray-500 dark:text-gray-400">Not set</span>;
  if (Array.isArray(value)) return <>{value.length ? value.map(String).join(", ") : "None"}</>;
  if (typeof value === "object") return <dl className={depth === 0 ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>
    {Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a === "before" ? -1 : a === "after" ? 1 : 0) - (b === "before" ? -1 : b === "after" ? 1 : 0)).map(([key, item]) => <div key={key} className={depth === 0 ? "audit-detail-panel min-w-0 rounded-lg p-3" : "min-w-0"}>
      <dt className="mb-1 text-xs font-medium capitalize text-gray-500 dark:text-gray-400">{detailLabels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2")}</dt>
      <dd className="whitespace-pre-wrap break-words"><DetailValue value={item} depth={depth + 1} /></dd>
    </div>)}
  </dl>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))) {
    return <>{new Date(value).getFullYear() >= 9999 ? "Permanent" : formatEventDate(value)}</>;
  }
  return <>{String(value)}</>;
}

export default function AuditHistoryTab() {
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [completed, setCompleted] = useState("");
  const [error, setError] = useState("");
  const requestKey = JSON.stringify([action, actor, from, to, page, refresh]);
  const loading = completed !== requestKey;
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      getAuditHistory({ page, ...(action && { action }), ...(actor && { actor }), ...(from && { from }), ...(to && { to }) })
        .then(data => {
          if (!active) return;
          setError("");
          if (page > Math.max(1, data.totalPages)) setPage(Math.max(1, data.totalPages));
          else { setItems(data.items); setTotalPages(data.totalPages); }
        })
        .catch(() => { if (active) setError("Could not load audit history. Check the date range and try again."); })
        .finally(() => { if (active) setCompleted(requestKey); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [action, actor, from, to, page, refresh, requestKey]);

  return <section aria-label="Audit history" className="space-y-4 text-gray-900 dark:text-gray-100">
    <p className="text-sm text-gray-500 dark:text-gray-400">Staff actions recorded from the introduction of audit history onward. Date filters use UTC; times below use your local timezone.</p>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm">Action<select aria-label="Action" className={inputClass} value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
        <option value="">All actions</option>{Object.entries(auditActions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label className="text-sm">Staff name or ID<input className={inputClass} value={actor} maxLength={100} onChange={e => { setActor(e.target.value); setPage(1); }} /></label>
      <label className="text-sm">From (UTC)<input type="date" className={inputClass} value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></label>
      <label className="text-sm">To (UTC)<input type="date" className={inputClass} value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></label>
    </div>
    <button type="button" onClick={() => setRefresh(n => n + 1)} disabled={loading} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800">Refresh history</button>
    {loading ? <LoadingBlock label="Loading audit history..." /> : error ? <p role="alert" className="text-red-600 dark:text-red-400">{error} <button className="underline" onClick={() => setRefresh(n => n + 1)}>Retry</button></p> : items.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No recorded actions match these filters.</p> : <ol className="space-y-3">
      {items.map(entry => <li key={entry.id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-medium">{auditActions[entry.action]}</h2><time dateTime={entry.createdAt} className="text-xs text-gray-500 dark:text-gray-400">{formatEventDate(entry.createdAt)}</time></div>
        <p className="mt-1 break-words text-sm">{entry.actorName} <span className="text-gray-500 dark:text-gray-400">({entry.actorRole === "ADMIN" ? "Admin" : "Moderator"})</span></p>
        <p className="mt-1 break-words text-sm">{entry.targetLabel}</p>
        <details className="mt-3 text-sm"><summary className="cursor-pointer text-indigo-600 dark:text-indigo-400">View details</summary><dl className="mt-3 space-y-2">
          <div><dt className="text-xs text-gray-500 dark:text-gray-400">Staff ID</dt><dd className="break-all">{entry.actorId}</dd></div>
          <div><dt className="text-xs text-gray-500 dark:text-gray-400">Target ({entry.targetType.toLowerCase().replaceAll("_", " ")})</dt><dd className="break-all">{entry.targetId}</dd></div>
        </dl><div className="mt-3"><DetailValue value={entry.details} /></div></details>
      </li>)}
    </ol>}
    {!error && !loading && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
  </section>;
}
