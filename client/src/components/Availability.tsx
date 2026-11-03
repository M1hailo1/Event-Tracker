import type { Event } from "../types";
import { useEventState } from "../utils/eventLifecycle";

export default function Availability({ event }: { event: Event }) {
  const state = useEventState(event);
  const remaining = event.maxCapacity == null ? null : Math.max(0, event.maxCapacity - (event._count?.registrations ?? 0));
  const label = state === "ONGOING" ? "Happening now" : state === "ENDED" ? "Ended" : remaining === 0 ? "Full" : remaining === null ? "Open places" : `${remaining} ${remaining === 1 ? "place" : "places"} left`;
  return <span className={`text-xs font-medium ${state === "ENDED" ? "text-gray-500 dark:text-gray-400" : state === "UPCOMING" && remaining === 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>{label}</span>;
}
