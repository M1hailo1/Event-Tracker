import { useEffect, useState } from "react";

export function getEventState(event: { date: string; endDate?: string | null; cancelledAt?: string | null }, now = Date.now()) {
  if (event.cancelledAt) return "CANCELLED";
  if (new Date(event.endDate ?? event.date).getTime() <= now) return "ENDED";
  return new Date(event.date).getTime() <= now ? "ONGOING" : "UPCOMING";
}

export function useEventClock(events: { date: string; endDate?: string | null }[]) {
  const [clock, setClock] = useState(0);
  const boundaries = events.flatMap(event => [event.date, event.endDate ?? event.date]).join(",");
  useEffect(() => {
    const refresh = () => setClock(value => value + 1);
    const now = Date.now();
    const boundary = boundaries.split(",").map(value => new Date(value).getTime()).filter(time => time > now).sort((a, b) => a - b)[0];
    const timer = boundary === undefined ? undefined : window.setTimeout(refresh, Math.min(boundary - now + 1, 2147483647));
    window.addEventListener("focus", refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", refresh); };
  }, [boundaries, clock]);
  return clock;
}

export function useEventState(event: { date: string; endDate?: string | null; cancelledAt?: string | null }) {
  useEventClock([event]);
  return getEventState(event);
}
