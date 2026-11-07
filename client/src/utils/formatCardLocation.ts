export function formatCardLocation(location: string) {
  const parts = location.split(",").map(part => part.trim()).filter(Boolean);
  return parts.at(-1) ?? location;
}
