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
import { formatEventDate } from "../utils/formatDate";

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

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!event) return <p className="text-gray-500">Event not found</p>;

  const isFull =
    event.maxCapacity !== null &&
    (event._count?.registrations ?? 0) >= event.maxCapacity;
  const isPastEvent = new Date(event.date) < new Date();

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/"
        className="text-sm text-indigo-600 hover:text-indigo-700 mb-4 inline-block"
      >
        &larr; Back to list
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          {event.category && (
            <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full whitespace-nowrap ml-3">
              {event.category.name}
            </span>
          )}
        </div>

        {event.description && (
          <p className="text-gray-600 mb-4">{event.description}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
          <div>
            <span className="text-gray-400">Date</span>
            <p className="font-medium text-gray-800">
              {formatEventDate(event.date)}
              {event.endDate && ` — ${formatEventDate(event.endDate)}`}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Location</span>
            <p className="font-medium text-gray-800">{event.location}</p>
          </div>
          <div>
            <span className="text-gray-400">Creator</span>
            <p className="font-medium text-gray-800">{event.createdBy?.name}</p>
          </div>
          <div>
            <span className="text-gray-400">Attendees</span>
            <p className="font-medium text-gray-800">
              {event._count?.registrations ?? 0}
              {event.maxCapacity
                ? ` / ${event.maxCapacity}`
                : " (unlimited places)"}
            </p>
          </div>
        </div>

        {event.isRecurring && (
          <p className="text-xs text-gray-500 mb-4">
            Takes place: {event.recurrencePattern}
          </p>
        )}

        <div className="mb-4">
          <LocationPicker
            latitude={event.latitude}
            longitude={event.longitude}
            readOnly
          />
        </div>

        {actionError && (
          <p className="text-red-600 text-sm mb-3">{actionError}</p>
        )}

        {isPastEvent ? (
          <p className="text-sm text-gray-500 italic">
            This event already finished.
          </p>
        ) : user ? (
          isRegistered ? (
            <button
              onClick={handleUnregister}
              disabled={isActionLoading}
              className="bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Leave event
            </button>
          ) : (
            <button
              onClick={handleRegister}
              disabled={isActionLoading || isFull}
              className="bg-indigo-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isFull ? "Full" : "Join event"}
            </button>
          )
        ) : (
          <p className="text-sm text-gray-600">
            <Link
              to="/login"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sign in
            </Link>{" "}
            to join the event.
          </p>
        )}

        {user && user.id === event.createdByUserId && !isPastEvent && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => navigate(`/events/${event.id}/edit`)}
              className="text-sm font-medium text-gray-700 hover:text-indigo-600"
            >
              Edit event
            </button>
            <button
              onClick={handleDelete}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Delete event
            </button>
          </div>
        )}

        {event.registrations && event.registrations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              List of Attendees
            </h3>
            <ul className="flex flex-wrap gap-2">
              {event.registrations.map((r) => (
                <li
                  key={r.id}
                  className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                >
                  {r.user?.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
