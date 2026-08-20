import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEventById, updateEvent } from "../api/eventsApi";
import type { CreateEventPayload } from "../api/eventsApi";
import { updateEventAdmin } from "../api/adminApi";
import type { Event } from "../types";
import EventForm from "../components/EventForm";
import { useAuth } from "../context/AuthContext";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getEventById(id)
      .then(setEvent)
      .catch((err) => {
        setError("Mistake while loading event");
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading)
    return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!event)
    return <p className="text-gray-500 dark:text-gray-400">Event not found</p>;

  const isOwner = user?.id === event.createdByUserId;
  const isAdmin = user?.role === "ADMIN";

  if (!user || (!isOwner && !isAdmin)) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        You don't have permission to edit this event.
      </p>
    );
  }

  async function handleUpdate(values: CreateEventPayload) {
    if (!id) return;
    if (isOwner) {
      await updateEvent(id, values);
    } else {
      await updateEventAdmin(id, values);
    }
    navigate(`/events/${id}`);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Edit event
      </h1>
      {!isOwner && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
          You're editing this event as an admin, not as its organizer.
        </p>
      )}
      <EventForm
        initialData={{
          name: event.name,
          description: event.description,
          categoryId: event.categoryId,
          date: event.date,
          endDate: event.endDate,
          location: event.location,
          latitude: event.latitude,
          longitude: event.longitude,
          maxCapacity: event.maxCapacity,
          isRecurring: event.isRecurring,
          recurrencePattern: event.recurrencePattern,
          visibility: event.visibility,
        }}
        onSubmit={handleUpdate}
        onCancel={() => navigate(`/events/${id}`)}
        submitLabel="Save changes"
      />
    </div>
  );
}
