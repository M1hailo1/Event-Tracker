import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { getAllCategories, createCategory } from "../api/categoriesApi";
import type { Category, RecurrencePattern } from "../types";
import LocationPicker from "./LocationPicker";

export interface EventFormValues {
  name: string;
  description?: string;
  categoryId: string;
  date: string;
  location: string;
  latitude: number;
  longitude: number;
  maxCapacity?: number;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  isInviteOnly?: boolean;
}

interface EventFormProps {
  initialData?: {
    name: string;
    description: string | null;
    categoryId: string;
    date: string;
    location: string;
    latitude: number;
    longitude: number;
    maxCapacity: number | null;
    isRecurring: boolean;
    recurrencePattern: RecurrencePattern | null;
    isInviteOnly: boolean;
  };
  onSubmit: (values: EventFormValues) => Promise<void>;
  submitLabel: string;
}

function toDatetimeLocalValue(isoDate: string): string {
  const d = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventForm({
  initialData,
  onSubmit,
  submitLabel,
}: EventFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [date, setDate] = useState(
    initialData ? toDatetimeLocalValue(initialData.date) : "",
  );
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [latitude, setLatitude] = useState<number | null>(
    initialData?.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialData?.longitude ?? null,
  );
  const [maxCapacity, setMaxCapacity] = useState(
    initialData?.maxCapacity?.toString() ?? "",
  );
  const [isRecurring, setIsRecurring] = useState(
    initialData?.isRecurring ?? false,
  );
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(
    initialData?.recurrencePattern ?? "YEARLY",
  );
  const [isInviteOnly, setIsInviteOnly] = useState(
    initialData?.isInviteOnly ?? false,
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getAllCategories().then(setCategories).catch(console.error);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!categoryId) {
      setError("Choose category");
      return;
    }
    if (categoryId === "CUSTOM" && !customCategoryName.trim()) {
      setError("Enter category title");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Choose location on map");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalCategoryId = categoryId;

      if (categoryId === "CUSTOM") {
        const newCategory = await createCategory(customCategoryName.trim());
        finalCategoryId = newCategory.id;
      }

      await onSubmit({
        name,
        description: description || undefined,
        categoryId: finalCategoryId,
        date: new Date(date).toISOString(),
        location,
        latitude,
        longitude,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : undefined,
        isInviteOnly,
      });
    } catch (err) {
      setError("Failed to edit event");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Title</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label>Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          <option value="">-- Choose --</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="CUSTOM">+ Custom</option>
        </select>
      </div>

      {categoryId === "CUSTOM" && (
        <div>
          <label>Custom category title</label>
          <input
            type="text"
            value={customCategoryName}
            onChange={(e) => setCustomCategoryName(e.target.value)}
            required
          />
        </div>
      )}

      <div>
        <label>Date and time</label>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Choose location on map</label>
        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          onLocationSelect={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />
        {latitude !== null && longitude !== null && (
          <p>
            Izabrano: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
        )}
      </div>

      <div>
        <label>Capacity (optional)</label>
        <input
          type="number"
          value={maxCapacity}
          onChange={(e) => setMaxCapacity(e.target.value)}
          min={1}
        />
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          Recurring event
        </label>
      </div>

      {isRecurring && (
        <div>
          <label>Frequency</label>
          <select
            value={recurrencePattern}
            onChange={(e) =>
              setRecurrencePattern(e.target.value as RecurrencePattern)
            }
          >
            <option value="DAILY">Every day</option>
            <option value="WEEKLY">Every week</option>
            <option value="MONTHLY">Every month</option>
            <option value="YEARLY">Every year</option>
          </select>
        </div>
      )}

      <div>
        <label>
          <input
            type="checkbox"
            checked={isInviteOnly}
            onChange={(e) => setIsInviteOnly(e.target.checked)}
          />
          Invite only
        </label>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
