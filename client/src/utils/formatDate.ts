export function formatEventDate(isoDate: string): string {
  const date = new Date(isoDate);

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEventDateRange(
  startIso: string,
  endIso: string | null,
): string {
  const start = formatEventDate(startIso);
  if (!endIso) return start;

  const startDate = new Date(startIso);
  const endDate = new Date(endIso);

  const sameDay = startDate.toDateString() === endDate.toDateString();

  if (sameDay) {
    const endTime = endDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${start} – ${endTime}`;
  }

  return `${start} – ${formatEventDate(endIso)}`;
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
