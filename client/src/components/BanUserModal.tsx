import type { BanDuration } from "../types";
import { useEffect, useId, useRef, useState } from "react";
import { isAxiosError } from "axios";

const banDurationOptions: { value: BanDuration; label: string }[] = [
  { value: "1h", label: "1 Hour" },
  { value: "1w", label: "1 Week" },
  { value: "1m", label: "1 Month" },
  { value: "forever", label: "Forever" },
];

interface BanUserModalProps {
  userName: string;
  onCancel: () => void;
  onConfirm: (duration: BanDuration, reason: string) => Promise<void> | void;
}

export default function BanUserModal({
  userName,
  onCancel,
  onConfirm,
}: BanUserModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null); const titleId = useId();
  useEffect(() => { dialog.current?.showModal(); const current = dialog.current; return () => current?.close(); }, []);
  return (
    <dialog ref={dialog} aria-labelledby={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-transparent p-0 shadow-xl backdrop:bg-black/40"
      onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}
      onClick={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Ban {userName}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose how long this user should be banned.
        </p>

        <label htmlFor="ban-reason" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
          Reason (optional, shown to the user)
        </label>
        <textarea
          id="ban-reason"
          disabled={busy}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm mb-4"
        />

        <div className="grid grid-cols-2 gap-2 mb-4">
          {banDurationOptions.map((opt) => (
            <button
              key={opt.value}
              disabled={busy}
              onClick={async () => {
                if (busy) return; setBusy(true); setError("");
                try { await onConfirm(opt.value, reason.trim()); }
                catch (err) { const detail = isAxiosError(err) ? err.response?.data?.error : null; setError(typeof detail === "string" ? detail : "Failed to ban user. Please try again."); setBusy(false); }
              }}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-red-400 dark:hover:border-red-500 hover:text-red-600 dark:hover:text-red-400"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          disabled={busy}
          onClick={onCancel}
          className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-1"
        >
          Cancel
        </button>
        {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {busy && <p role="status" className="mt-3 text-sm text-gray-500">Saving…</p>}
      </div>
    </dialog>
  );
}
