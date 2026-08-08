import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getEventById,
  registerForEvent,
  unregisterFromEvent,
  deleteEvent,
} from "../api/eventsApi";
import type { Event } from "../types";
import { useAuth } from "../context/AuthContext";
import LocationPicker from "../components/LocationPicker";

export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { user } = useAuth();

  const navigate = useNavigate();

  async function handleDelete() {
    if (!id) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this event?",
    );
    if (!confirmed) return;

    try {
      await deleteEvent(id);
      navigate("/");
    } catch (err) {
      setActionError("Failed to delete");
      console.error(err);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadEvent(id);
  }, [id]);

  async function loadEvent(eventId: string) {
    setIsLoading(true);
    try {
      const data = await getEventById(eventId);
      setEvent(data);
    } catch (err) {
      setError("Mistake while loading event");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const isRegistered = event?.registrations?.some((r) => r.userId === user?.id);

  async function handleRegister() {
    if (!id) return;
    setActionError("");
    setIsActionLoading(true);
    try {
      await registerForEvent(id);
      await loadEvent(id);
    } catch (err) {
      setActionError("Signup failed. Maybe the event is full.");
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleUnregister() {
    if (!id) return;
    setActionError("");
    setIsActionLoading(true);
    try {
      await unregisterFromEvent(id);
      await loadEvent(id);
    } catch (err) {
      setActionError("Failed to sign off.");
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  }

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!event) return <p>Event not found</p>;

  const isFull =
    event.maxCapacity !== null &&
    (event._count?.registrations ?? 0) >= event.maxCapacity;

  return (
    <div>
      <Link to="/">Back to list</Link>
      <h1>{event.name}</h1>
      {event.description && <p>{event.description}</p>}
      <p>
        <strong>Date:</strong> {new Date(event.date).toLocaleString("sr-RS")}
      </p>
      <p>
        <strong>Location:</strong> {event.location}
      </p>
      <div style={{ margin: "1rem 0" }}>
        <LocationPicker
          latitude={event.latitude}
          longitude={event.longitude}
          readOnly
        />
      </div>
      <p>
        <strong>Category:</strong> {event.category?.name}
      </p>
      <p>
        <strong>Creator:</strong> {event.createdBy?.name}
      </p>
      <p>
        <strong>Attendees:</strong> {event._count?.registrations ?? 0}
        {event.maxCapacity ? ` / ${event.maxCapacity}` : " (unlimited places)"}
      </p>
      {event.isRecurring && <p>Taking place: {event.recurrencePattern}</p>}

      {actionError && <p style={{ color: "red" }}>{actionError}</p>}

      {user ? (
        isRegistered ? (
          <button onClick={handleUnregister} disabled={isActionLoading}>
            Leave event
          </button>
        ) : (
          <button onClick={handleRegister} disabled={isActionLoading || isFull}>
            {isFull ? "Full" : "Join event"}
          </button>
        )
      ) : (
        <p>
          <Link to="/login">Sign in</Link> to join the event.
        </p>
      )}

      {user && user.id === event.createdByUserId && (
        <div style={{ marginTop: "1rem" }}>
          <button onClick={() => navigate(`/events/${event.id}/edit`)}>
            Edit event
          </button>
          <button onClick={handleDelete}>Delete event</button>
        </div>
      )}

      {event.registrations && event.registrations.length > 0 && (
        <div>
          <h3>List of Attendees</h3>
          <ul>
            {event.registrations.map((r) => (
              <li key={r.id}>{r.user?.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
