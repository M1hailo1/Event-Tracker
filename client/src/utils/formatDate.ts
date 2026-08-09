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
