import type { BanDuration } from "../types";
import { useState } from "react";

const banDurationOptions: { value: BanDuration; label: string }[] = [
  { value: "1h", label: "1 Hour" },
  { value: "1w", label: "1 Week" },
  { value: "1m", label: "1 Month" },
  { value: "forever", label: "Forever" },
];

interface BanUserModalProps {
  userName: string;
  onCancel: () => void;
  onConfirm: (duration: BanDuration, reason: string) => void;
}

export default function BanUserModal({
  userName,
  onCancel,
  onConfirm,
}: BanUserModalProps) {
  const [reason, setReason] = useState("");
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
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
              onClick={() => onConfirm(opt.value, reason.trim())}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-red-400 dark:hover:border-red-500 hover:text-red-600 dark:hover:text-red-400"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-1"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
