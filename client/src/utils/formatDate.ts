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
