import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "../utils/leafletIconFix";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  onAddressFound?: (address: string) => void;
  readOnly?: boolean;
}

function ClickHandler({
  onLocationSelect,
  onAddressFound,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
  onAddressFound?: (address: string) => void;
}) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);

      if (onAddressFound) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=sr-Latn`,
            { headers: { "User-Agent": "EventTrackerApp/1.0" } },
          );
          const data = await response.json();

          if (data.address) {
            const addr = data.address;
            const parts = [
              addr.amenity || addr.shop || addr.building,
              addr.road,
              addr.house_number,
              addr.suburb || addr.city_district,
              addr.city || addr.town,
            ].filter(Boolean);

            const shortAddress = parts.join(", ");
            onAddressFound(shortAddress || data.display_name);
          } else if (data.display_name) {
            onAddressFound(data.display_name);
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
        }
      }
    },
  });
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  onLocationSelect,
  onAddressFound,
  readOnly = false,
}: LocationPickerProps) {
  const defaultCenter: [number, number] = [44.8176, 20.4633];
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
        <ClickHandler
          onLocationSelect={onLocationSelect}
          onAddressFound={onAddressFound}
        />
      )}
      {position && <Marker position={position} />}
    </MapContainer>
  );
}
