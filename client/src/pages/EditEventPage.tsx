import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEventById, updateEvent } from "../api/eventsApi";
import type { CreateEventPayload } from "../api/eventsApi";
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

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!event) return <p>Event not found</p>;

  if (!user || user.id !== event.createdByUserId) {
    return <p>You don't have permission to edit this event.</p>;
  }

  async function handleUpdate(values: CreateEventPayload) {
    if (!id) return;
    await updateEvent(id, values);
    navigate(`/events/${id}`);
  }

  return (
    <div>
      <h1>Edit event</h1>
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
          isInviteOnly: event.isInviteOnly,
        }}
        onSubmit={handleUpdate}
        onCancel={() => navigate(`/events/${id}`)}
        submitLabel="Save changes"
      />
    </div>
  );
}
