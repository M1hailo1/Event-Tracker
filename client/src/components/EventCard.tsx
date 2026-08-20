import { Link } from "react-router-dom";
import type { Event } from "../types";
import { formatEventDateRange } from "../utils/formatDate";

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {event.name}
        </h3>
        {event.category && (
          <span className="text-xs font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full whitespace-nowrap ml-2">
            {event.category.name}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        {formatEventDateRange(event.date, event.endDate)}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {event.location}
      </p>

      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Attendees: {event._count?.registrations ?? 0}
        {event.maxCapacity ? ` / ${event.maxCapacity}` : ""}
      </p>
    </Link>
  );
}
