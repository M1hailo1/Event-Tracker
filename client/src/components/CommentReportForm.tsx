import { useState } from "react";
import { isAxiosError } from "axios";
import { reportComment } from "../api/commentsApi";
import type { ReportReason } from "../api/commentsApi";

export default function CommentReportForm({ eventId, commentId, onCancel, onReported }: {
  eventId: string; commentId: string; onCancel: () => void; onReported: () => void;
}) {
  const [reason, setReason] = useState<ReportReason>("HARASSMENT");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = "mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";
  return <form className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900" onSubmit={async e => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try { await reportComment(eventId, commentId, reason, details.trim()); onReported(); }
    catch (err) { setError(isAxiosError(err) ? err.response?.data?.error ?? "Failed to submit report" : "Failed to submit report"); }
    finally { setBusy(false); }
  }}>
    <label className="block text-sm text-gray-700 dark:text-gray-300">Report reason
      <select value={reason} disabled={busy} onChange={e => setReason(e.target.value as ReportReason)} className={input}>
        <option value="HARASSMENT">Harassment or bullying</option><option value="SPAM">Spam</option>
        <option value="INAPPROPRIATE">Inappropriate content</option><option value="OTHER">Other</option>
      </select>
    </label>
    <label className="block text-sm text-gray-700 dark:text-gray-300">Details (optional)
      <textarea value={details} disabled={busy} onChange={e => setDetails(e.target.value)} maxLength={500} rows={2} className={input} />
    </label>
    <p className="text-xs text-gray-500">Reports are reviewed by admins. Your identity is not shown to the comment author.</p>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    <div className="flex gap-3"><button disabled={busy} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? "Submitting..." : "Submit report"}</button>
      <button type="button" disabled={busy} onClick={onCancel} className="text-sm text-gray-500">Cancel</button></div>
  </form>;
}
