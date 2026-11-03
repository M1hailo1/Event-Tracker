import RatingDisplay from "./RatingDisplay";
import EventCover from "./EventCover";
import { Link } from "react-router-dom";
import type { Event } from "../types";
import { formatEventDateRange } from "../utils/formatDate";
import { getEventCover } from "../data/eventCovers";
import { getEventCategories } from "../utils/eventCategories";
import CategoryIcon from "./CategoryIcon";

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const hasCover = !!getEventCover(event.coverId);
  const dateLabel = formatEventDateRange(event.date, event.endDate);
  const categories = getEventCategories(event);
  return (
    <article className="relative h-full">
    <Link
      to={`/events/${event.id}`}
      className={`flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition ${hasCover ? "h-[336px]" : "h-48"}`}
    >
      <EventCover coverId={event.coverId} className="h-[132px] shrink-0 rounded-lg mb-3" />
      <div className="flex h-10 shrink-0 items-start mb-2" style={!hasCover ? { paddingRight: categories.length * 32 } : undefined}>
        <h3 title={event.name} className="h-10 w-full shrink-0 line-clamp-2 break-words text-base leading-5 font-semibold text-gray-900 dark:text-gray-100">
          {event.name}
        </h3>
      </div>

      <p title={dateLabel} className="shrink-0 truncate text-sm text-gray-500 dark:text-gray-400 mb-1">
        {dateLabel}
      </p>
      <p title={event.location} className="shrink-0 truncate text-sm text-gray-500 dark:text-gray-400 mb-1">
        {event.location}
      </p>

      {new Date(event.endDate ?? event.date) <= new Date() && (
        <div className="min-w-0 shrink-0 mb-1 [&_span]:truncate"><RatingDisplay rating={event.rating} label="Event rating" /></div>
      )}

      <p className="mt-auto shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">
        Attendees: {event._count?.registrations ?? 0}
        {event.maxCapacity ? ` / ${event.maxCapacity}` : ""}
      </p>
    </Link>
    <div role="group" aria-label="Event categories" className="absolute right-5 top-5 flex gap-1">
      {categories.map(category => <CategoryIcon key={category.id} name={category.name} />)}
    </div>
    </article>
  );
}
