import { useState, useEffect } from "react";
import { getAllEvents } from "../api/eventsApi";
import type { Event } from "../types";
import { useAuth } from "../context/AuthContext";
import EventCard from "../components/EventCard";

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPast, setShowPast] = useState(false);
  const { user } = useAuth();

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
  }, [showPast, user?.id]);

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
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
