import type { CSSProperties } from "react";
import type { Event } from "../types";
import { getEventCover } from "../data/eventCovers";
import EventCard from "./EventCard";

// With 48px tracks and 24px gaps, 3 tracks = 192px and 5 = 336px.
// Place each event in the shortest column instead of balancing CSS columns.
function positions(events: Event[], columns: number) {
  const nextRow = Array<number>(columns).fill(1);
  return events.map(event => {
    const column = nextRow.indexOf(Math.min(...nextRow));
    const row = nextRow[column];
    nextRow[column] += getEventCover(event.coverId) ? 5 : 3;
    return { column: column + 1, row };
  });
}

export default function EventCardGrid({ events }: { events: Event[] }) {
  const mobile = positions(events, 1);
  const tablet = positions(events, 2);
  const desktop = positions(events, 3);
  return <div role="list" aria-label="Events" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-[48px] gap-6">
    {events.map((event, index) => <div key={event.id} role="listitem"
      style={{ "--row-mobile": mobile[index].row, "--row-tablet": tablet[index].row,
        "--column-tablet": tablet[index].column, "--row-desktop": desktop[index].row,
        "--column-desktop": desktop[index].column } as CSSProperties}
      className={`${getEventCover(event.coverId) ? "row-span-5" : "row-span-3"} min-w-0 col-start-1 row-start-[var(--row-mobile)] md:col-start-[var(--column-tablet)] md:row-start-[var(--row-tablet)] lg:col-start-[var(--column-desktop)] lg:row-start-[var(--row-desktop)]`}>
      <EventCard event={event} />
    </div>)}
  </div>;
}
