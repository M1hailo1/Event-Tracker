import { isStaff } from "../utils/roles";
import { useConfirmAction } from "./ConfirmDialog";
import LoadingBlock from "./LoadingBlock";
import CommentReportForm from "./CommentReportForm";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, Reply, Pencil, Trash2, Flag } from "lucide-react";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";
import { createComment, deleteComment, getComments, updateComment } from "../api/commentsApi";
import type { EventComment } from "../api/commentsApi";

const buttonClass = "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50";
const actionClass = "inline-flex items-center gap-1 rounded px-1 py-2 text-xs focus-visible:outline-2 focus-visible:outline-indigo-500 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 disabled:opacity-50";
function errorMessage(err: unknown) {
  return isAxiosError(err) && typeof err.response?.data?.error === "string" ? err.response.data.error : "Something went wrong. Please try again.";
}

function CommentForm({ initial = "", label, onSave, onCancel }: {
  initial?: string; label: string; onSave: (body: string) => Promise<void>; onCancel?: () => void;
}) {
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <form className="space-y-2" onSubmit={async e => {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true); setError("");
    try { await onSave(body.trim()); setBody(""); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }}>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={2000} required disabled={busy}
        rows={3} placeholder="Write your comment..."
        className="mt-2 block w-full resize-y rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
    </label>
    <div className="flex items-center gap-3">
      <button type="submit" disabled={busy || !body.trim()} className={buttonClass}>{busy ? "Saving..." : label}</button>
      {onCancel && <button type="button" disabled={busy} onClick={onCancel} className={actionClass}>Cancel</button>}
      <span className="ml-auto text-xs text-gray-400">{body.length}/2000</span>
    </div>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
  </form>;
}

function CommentItem({ eventId, comment: initial, targetId, onDeleted }: { eventId: string; comment: EventComment; targetId?: string; onDeleted?: () => void }) {
  const { user } = useAuth();
  const [comment, setComment] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(Boolean(!initial.parentId && targetId && targetId !== initial.id));
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [replying, setReplying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replyVersion, setReplyVersion] = useState(0);
  const { confirm, confirmationDialog } = useConfirmAction();
  const own = user?.id === comment.user?.id;
  const articleRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (targetId === comment.id) {
      articleRef.current?.scrollIntoView({ block: "center" });
      articleRef.current?.focus({ preventScroll: true });
    }
  }, [targetId, comment.id]);
  if (comment.deletedAt && comment._count.replies === 0) return null;
  return <article ref={articleRef} tabIndex={-1} className={`py-4 scroll-mt-24 ${targetId === comment.id ? "rounded-lg ring-2 ring-indigo-400 px-3" : ""}`}>
    {confirmationDialog}
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      {comment.user ? <>
        <Link to={`/users/${comment.user.id}`} className="font-semibold text-gray-800 hover:text-indigo-600 dark:text-gray-200">{comment.user.name}</Link>
        {comment.user.role !== "USER" && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">{comment.user.role === "ADMIN" ? "Admin" : "Moderator"}</span>}
      </> : <span>Deleted comment</span>}
      <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
      {!comment.deletedAt && comment.updatedAt !== comment.createdAt && <span>(edited)</span>}
    </div>
    <div className="mt-2">
      {editing ? <CommentForm initial={comment.body} label="Save changes" onCancel={() => setEditing(false)} onSave={async body => {
        await updateComment(eventId, comment.id, body);
        setComment({ ...comment, body, updatedAt: new Date().toISOString() }); setEditing(false);
      }} /> : <p className={`whitespace-pre-wrap break-words text-sm ${comment.deletedAt ? "italic text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>{comment.deletedAt ? "Comment deleted" : comment.body}</p>}
    </div>
    <div className="mt-3 flex flex-wrap gap-4">
      {!comment.parentId && user && !comment.deletedAt && <button type="button" className={actionClass} onClick={() => setReplying(!replying)}><Reply size={14} />Reply</button>}
      {!comment.deletedAt && own && !editing && <button type="button" className={actionClass} onClick={() => setEditing(true)}><Pencil size={13} />Edit</button>}
      {!comment.deletedAt && (own || isStaff(user?.role)) && <button type="button" disabled={busy} className={actionClass} onClick={async () => {
        confirm({ title: "Delete comment?", message: "Its replies will remain visible.", confirmLabel: "Delete comment", danger: true, action: async () => {
          setBusy(true); setError("");
          try { await deleteComment(eventId, comment.id); setComment({ ...comment, body: "", user: null, deletedAt: new Date().toISOString() }); setEditing(false); setReplying(false); onDeleted?.(); }
          finally { setBusy(false); }
        } });
      }}><Trash2 size={13} />{busy ? "Deleting..." : "Delete"}</button>}
      {user && !own && !comment.deletedAt && <button type="button" className={actionClass} disabled={reported} onClick={() => setReporting(!reporting)}><Flag size={13} />{reported ? "Reported" : "Report"}</button>}
      {!comment.parentId && comment._count.replies > 0 && <button type="button" className={actionClass} aria-expanded={showReplies} onClick={() => setShowReplies(!showReplies)}>{showReplies ? "Hide replies" : `View replies (${comment._count.replies})`}</button>}
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    {reporting && !comment.deletedAt && <CommentReportForm eventId={eventId} commentId={comment.id} onCancel={() => setReporting(false)} onReported={() => { setReported(true); setReporting(false); }} />}
    {reported && <p role="status" className="mt-2 text-xs text-gray-500">Report submitted for admin review.</p>}
    {replying && <div className="mt-3"><CommentForm label="Post reply" onCancel={() => setReplying(false)} onSave={async body => {
      await createComment(eventId, body, comment.id);
      setComment({ ...comment, _count: { replies: comment._count.replies + 1 } });
      setReplying(false); setShowReplies(true); setReplyVersion(v => v + 1);
    }} /></div>}
    {showReplies && <div className="ml-3 mt-3 border-l-2 border-indigo-100 pl-4 dark:border-gray-700"><CommentList key={replyVersion} eventId={eventId} parentId={comment.id} targetId={targetId} onDeleted={() => setComment(previous => ({ ...previous, _count: { replies: Math.max(0, previous._count.replies - 1) } }))} /></div>}
  </article>;
}

function CommentList({ eventId, parentId, targetId, onDeleted }: { eventId: string; parentId?: string; targetId?: string; onDeleted?: () => void }) {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      let page = await getComments(eventId, parentId, undefined, parentId ? undefined : targetId);
      while (active && parentId && targetId && page.nextCursor && !page.comments.some(comment => comment.id === targetId)) {
        const next = await getComments(eventId, parentId, page.nextCursor);
        page = { comments: [...page.comments, ...next.comments], nextCursor: next.nextCursor };
      }
      return page;
    })().then(page => {
      if (active) { setComments(page.comments); setCursor(page.nextCursor); }
    }).catch(err => { if (active) setError(errorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [eventId, parentId, targetId]);
  async function loadMore() {
    setLoading(true); setError("");
    try {
      const page = await getComments(eventId, parentId, cursor ?? undefined, parentId ? undefined : targetId);
      setComments(previous => [...previous, ...page.comments.filter(item => !previous.some(existing => existing.id === item.id))]);
      setCursor(page.nextCursor);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }
  return <div>
    <div className="divide-y divide-gray-100 dark:divide-gray-700">{comments.map(comment => <CommentItem key={comment.id} eventId={eventId} comment={comment} targetId={targetId} onDeleted={onDeleted} />)}</div>
    {loading && <LoadingBlock label="Loading comments..." compact />}
    {!loading && !error && comments.length === 0 && <p className="py-4 text-sm text-gray-500 dark:text-gray-400">{parentId ? "No replies yet." : "No comments yet. Start the conversation!"}</p>}
    {error && <p role="alert" className="my-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    {!loading && (cursor || error) && <button type="button" className={actionClass} onClick={loadMore}>{error ? "Try again" : "Load more"}</button>}
  </div>;
}

export default function EventComments({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const location = useLocation();
  const requestedTarget = new URLSearchParams(location.search).get("comment");
  const targetId = requestedTarget && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedTarget) ? requestedTarget : undefined;
  return <section aria-label="Event comments" className="mt-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800">
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100"><MessageSquare size={20} className="text-indigo-500" />Comments</h2>
    {user ? <CommentForm label="Post comment" onSave={async body => { await createComment(eventId, body); setVersion(v => v + 1); }} /> : <p className="mb-4 text-sm text-gray-500 dark:text-gray-400"><Link to="/login" className="text-indigo-600 dark:text-indigo-400">Sign in</Link> to join the conversation.</p>}
    {targetId && <p className="my-3 text-sm"><Link className="text-indigo-600 dark:text-indigo-400 underline" to={location.pathname}>View all comments</Link></p>}
    <CommentList key={`${eventId}:${user?.id ?? "guest"}:${version}:${targetId ?? "all"}`} eventId={eventId} targetId={targetId} />
  </section>;
}
