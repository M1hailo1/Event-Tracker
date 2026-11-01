import { useEffect, useId, useRef, useState } from "react";

export default function ModeratorRoleModal({ userName, removing, onCancel, onConfirm }: {
  userName: string;
  removing: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  return <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId}
    className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-transparent p-0 shadow-xl backdrop:bg-black/40"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <div className="rounded-xl bg-white p-6 dark:bg-gray-800" aria-busy={busy}>
      <h2 id={titleId} className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {removing ? "Remove moderator privileges?" : "Make moderator?"}
      </h2>
      <p id={descriptionId} className="mb-5 break-words text-sm text-gray-500 dark:text-gray-400">
        {removing ? <>Remove moderator privileges from <strong>{userName}</strong>? They will return to a regular user account.</> : <>Give <strong>{userName}</strong> moderator privileges? They will be able to manage users, events, and comment reports.</>}
      </p>
      {error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" autoFocus disabled={busy} onClick={onCancel}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">No</button>
        <button type="button" disabled={busy} onClick={async () => {
          if (busy) return;
          setBusy(true); setError("");
          try { await onConfirm(); }
          catch { setError("Failed to change moderator privileges. Please try again."); setBusy(false); }
        }} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50">
          {busy ? "Saving..." : "Yes"}
        </button>
      </div>
    </div>
  </dialog>;
}
