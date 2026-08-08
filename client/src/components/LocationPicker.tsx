import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "../utils/leafletIconFix";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

function ClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
  readOnly = false,
}: LocationPickerProps) {
  const defaultCenter: [number, number] = [44.8176, 20.4633]; // BG
  const position: [number, number] | null =
    latitude !== null && longitude !== null ? [latitude, longitude] : null;

  return (
    <MapContainer
      center={position ?? defaultCenter}
      zoom={13}
      style={{ height: "400px", width: "100%" }}
      dragging={!readOnly}
      scrollWheelZoom={!readOnly}
      doubleClickZoom={!readOnly}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {!readOnly && onLocationSelect && (
        <ClickHandler onLocationSelect={onLocationSelect} />
      )}
      {position && <Marker position={position} />}
    </MapContainer>
  );
}
