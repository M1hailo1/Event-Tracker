import { Star } from "lucide-react";
import type { RatingSummary } from "../types";

export default function RatingDisplay({ rating, label }: { rating?: RatingSummary; label: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400" aria-label={label}>
      <Star size={16} className="shrink-0 text-amber-500 fill-amber-500" aria-hidden="true" />
      <span>{label}: {rating?.count ? `${rating.average!.toFixed(1)} / 5 (${rating.count} ${rating.count === 1 ? "rating" : "ratings"})` : "No ratings yet"}</span>
    </p>
  );
}
