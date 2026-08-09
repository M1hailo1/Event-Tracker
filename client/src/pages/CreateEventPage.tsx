import { useNavigate } from "react-router-dom";
import { createEvent } from "../api/eventsApi";
import type { CreateEventPayload } from "../api/eventsApi";
import EventForm from "../components/EventForm";
import { useAuth } from "../context/AuthContext";

export default function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <p>You must be logged in to create events.</p>;
  }

  async function handleCreate(values: CreateEventPayload) {
    const event = await createEvent(values);
    navigate(`/events/${event.id}`);
  }

  return (
    <div>
      <h1>Create event</h1>
      <EventForm
        onSubmit={handleCreate}
        onCancel={() => navigate("/")}
        submitLabel="Create event"
      />
    </div>
  );
}
