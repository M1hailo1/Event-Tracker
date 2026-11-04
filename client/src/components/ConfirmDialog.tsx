import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { isAxiosError } from "axios";

export interface Confirmation {
  title: string;
  message: ReactNode;
  action: () => Promise<void>;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({ title, message, action, confirmLabel = "Yes", danger = false, onCancel }: Confirmation & { onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId(), descriptionId = useId();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); const current = dialog.current; return () => current?.close(); }, []);
  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-transparent p-0 shadow-xl backdrop:bg-black/40"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <div className="rounded-xl bg-white p-6 dark:bg-gray-800" aria-busy={busy}>
      <h2 id={titleId} className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <div id={descriptionId} className="mb-5 break-words text-sm text-gray-500 dark:text-gray-400"><fieldset disabled={busy} className="min-w-0">{message}</fieldset></div>
      {error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" autoFocus disabled={busy} onClick={onCancel} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
        <button type="button" disabled={busy} onClick={async () => {
          if (busy) return; setBusy(true); setError("");
          try { await action(); onCancel(); }
          catch (err) { const detail = isAxiosError(err) ? err.response?.data?.error : null; setError(typeof detail === "string" ? detail : "Could not complete this action. Please try again."); setBusy(false); }
        }} className={`rounded-lg px-3 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>{busy ? "Saving…" : confirmLabel}</button>
      </div>
    </div>
  </dialog>;
}
