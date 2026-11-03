import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { getCommentReports, reviewCommentReport, banUserAdmin } from "../api/adminApi";
import type { CommentReport, ReportStatus } from "../api/adminApi";
import BanUserModal from "./BanUserModal";
import LoadingBlock from "./LoadingBlock";
import { useConfirmAction } from "./ConfirmDialog";

export default function CommentReportsTab() {
  const { confirm, confirmationDialog } = useConfirmAction();
  const { user } = useAuth();
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const [reports, setReports] = useState<CommentReport[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [banning, setBanning] = useState<CommentReport["comment"]["user"] | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setReports([]); setCursor(null); setError("");
    getCommentReports(status).then(page => { if (active) { setReports(page.reports); setCursor(page.nextCursor); } })
      .catch(() => { if (active) setError("Failed to load reports"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status]);
  async function loadMore() {
    setLoading(true); setError("");
    try {
      const page = await getCommentReports(status, cursor ?? undefined);
      setReports(previous => [...previous, ...page.reports.filter(report => !previous.some(item => item.id === report.id))]);
      setCursor(page.nextCursor);
    } catch { setError("Failed to load reports"); }
    finally { setLoading(false); }
  }
  async function review(report: CommentReport, action: "DISMISS" | "REMOVE") {
    if (action === "REMOVE") {
      confirm({ title: "Remove comment?", message: "The comment will be removed. Its replies will remain visible.", confirmLabel: "Remove comment", danger: true, action: async () => {
        await reviewCommentReport(report.id, "REMOVE"); setReports(previous => previous.filter(item => item.comment.id !== report.comment.id));
      } });
      return;
    }
    setBusy(true); setError("");
    try { await reviewCommentReport(report.id, action); setReports(previous => previous.filter(item => item.comment.id !== report.comment.id)); }
    catch (err) { setError(isAxiosError(err) ? err.response?.data?.error ?? "Failed to review report" : "Failed to review report"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {confirmationDialog}
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm text-gray-700 dark:text-gray-300">Report status <select value={status} disabled={busy || loading} onChange={e => setStatus(e.target.value as ReportStatus)} className="ml-2 rounded-lg border border-gray-300 bg-white p-2 dark:border-gray-600 dark:bg-gray-800">
        <option value="OPEN">Open</option><option value="DISMISSED">Dismissed</option><option value="REMOVED">Removed</option>
      </select></label>
      <p className="text-xs text-gray-500">Reviewing a comment resolves all its open reports.</p>
    </div>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    {reports.map(report => <article key={report.id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
      <div className="flex flex-wrap justify-between gap-2"><Link to={`/events/${report.comment.event.id}`} className="font-semibold text-indigo-600 dark:text-indigo-400">{report.comment.event.name}</Link><time>{new Date(report.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</time></div>
      <p>Comment by <Link className="font-medium text-indigo-600 dark:text-indigo-400" to={`/users/${report.comment.user.id}`}>{report.comment.user.name}</Link> · Reported by {report.reporter.name}</p>
      <p className="font-medium">{report.reason.charAt(0) + report.reason.slice(1).toLowerCase()}</p>
      {report.details && <p className="whitespace-pre-wrap break-words">{report.details}</p>}
      <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900"><p className="mb-1 text-xs text-gray-500">Comment when reported</p><p className="whitespace-pre-wrap break-words">{report.bodySnapshot}</p></div>
      {report.comment.deletedAt ? <p className="text-xs italic text-gray-500">Comment has been deleted.</p> : report.comment.body !== report.bodySnapshot && <div><p className="text-xs text-gray-500">Current comment</p><p className="whitespace-pre-wrap break-words">{report.comment.body}</p></div>}
      {status === "OPEN" && <div className="flex flex-wrap gap-4">
        <button disabled={busy} onClick={() => review(report, "DISMISS")} className="text-indigo-600 disabled:opacity-50 dark:text-indigo-400">Dismiss reports</button>
        <button disabled={busy} onClick={() => review(report, "REMOVE")} className="text-red-600 disabled:opacity-50 dark:text-red-400">Remove comment</button>
        {report.comment.user.id !== user?.id && report.comment.user.role !== "ADMIN" && <button disabled={busy} onClick={() => setBanning(report.comment.user)} className="text-red-600 disabled:opacity-50 dark:text-red-400">Ban author</button>}
      </div>}
    </article>)}
    {loading && <LoadingBlock label="Loading reports..." />}
    {!loading && !error && !reports.length && <p className="text-sm text-gray-500">No {status.toLowerCase()} reports.</p>}
    {!loading && (cursor || error) && <button disabled={busy} onClick={loadMore} className="text-sm text-indigo-600 dark:text-indigo-400">{error ? "Try again" : "Load more"}</button>}
    {banning && <BanUserModal userName={banning.name} onCancel={() => setBanning(null)} onConfirm={async (duration, reason) => {
      await banUserAdmin(banning.id, duration, reason); setBanning(null);
    }} />}
  </div>;
}
