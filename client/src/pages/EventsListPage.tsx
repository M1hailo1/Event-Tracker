import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllEvents } from "../api/eventsApi";
import type { Event } from "../types";
import { formatEventDateRange } from "../utils/formatDate";

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      try {
        const data = await getAllEvents(showPast);
        setEvents(data);
      } catch (err) {
        setError("Mistake while loading events");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, [showPast]);

  if (isLoading) {
    return <p className="text-gray-500">Loading...</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {showPast ? "Event history" : "Events"}
        </h1>
        <button
          onClick={() => setShowPast(!showPast)}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {showPast ? "Show future events" : "Show history"}
        </button>
      </div>

      {events.length === 0 && (
        <p className="text-gray-500">There are no events currently.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-300 transition"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {event.name}
              </h3>
              {event.category && (
                <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                  {event.category.name}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 mb-1">
              {formatEventDateRange(event.date, event.endDate)}
            </p>
            <p className="text-sm text-gray-500 mb-3">{event.location}</p>

            <p className="text-sm font-medium text-gray-700">
              Attendees: {event._count?.registrations ?? 0}
              {event.maxCapacity ? ` / ${event.maxCapacity}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
