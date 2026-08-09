import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllEvents } from "../api/eventsApi";
import type { Event } from "../types";
import { useAuth } from "../context/AuthContext";

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user, logout } = useAuth();
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      try {
        const data = await getAllEvents(showPast);
        setEvents(data);
      } catch (err) {
        setError("Mistake while trying to load events");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, [showPast]);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <header>
        <h1>{showPast ? "Event history" : "Events"}</h1>
        {user ? (
          <div>
            <span>Hello, {user.name}</span>
            <Link to="/profile">My profile</Link>
            <Link to="/events/new">Create event</Link>
            <button onClick={logout}>Sign out</button>
          </div>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
      </header>

      <button onClick={() => setShowPast(!showPast)}>
        {showPast ? "Show future events" : "Show history"}
      </button>

      {events.length === 0 && <p>No events taking place.</p>}

      <ul>
        {events.map((event) => (
          <li key={event.id}>
            <Link to={`/events/${event.id}`}>
              <h3>{event.name}</h3>
            </Link>
            <p>{new Date(event.date).toLocaleString("sr-RS")}</p>
            <p>{event.location}</p>
            <p>{event.category?.name}</p>
            <p>
              Attendees: {event._count?.registrations ?? 0}
              {event.maxCapacity ? ` / ${event.maxCapacity}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
