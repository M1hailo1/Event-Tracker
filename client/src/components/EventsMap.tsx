import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "../utils/leafletIconFix";
import type { Event } from "../types";

interface EventsMapProps {
  events: Event[];
}

const DEFAULT_CENTER: [number, number] = [44.8176, 20.4633];

function FitBoundsToEvents({ events }: { events: Event[] }) {
  const map = useMap();

  useEffect(() => {
    if (events.length === 0) return;

    if (events.length === 1) {
      map.setView([events[0].latitude, events[0].longitude], 13);
      return;
    }

    const bounds = L.latLngBounds(
      events.map((e) => [e.latitude, e.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [events, map]);

  return null;
}

export default function EventsMap({ events }: EventsMapProps) {
  const navigate = useNavigate();

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={12}
      style={{ height: "600px", width: "100%" }}
      className="rounded-xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FitBoundsToEvents events={events} />
      {events.map((event) => (
        <Marker
          key={event.id}
          position={[event.latitude, event.longitude]}
          eventHandlers={{
            click: () => navigate(`/events/${event.id}`),
          }}
        >
          <Tooltip direction="top" offset={[0, -30]}>
            {event.name}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
