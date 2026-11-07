import { Star } from "lucide-react";
import type { RatingSummary } from "../types";

export default function RatingDisplay({ rating, label, compact = false }: { rating?: RatingSummary; label: string; compact?: boolean }) {
  if (compact && !rating?.count) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400" aria-label={compact ? `${label}: ${rating!.average!.toFixed(1)} out of 5, ${rating!.count} ratings` : label}>
      <Star size={16} className="shrink-0 text-indigo-500 fill-indigo-500 dark:text-indigo-400 dark:fill-indigo-400" aria-hidden="true" />
      <span>{compact ? `${rating!.average!.toFixed(1)} (${rating!.count})` : `${label}: ${rating?.count ? `${rating.average!.toFixed(1)} / 5 (${rating.count} ${rating.count === 1 ? "rating" : "ratings"})` : "No ratings yet"}`}</span>
    </p>
  );
}
