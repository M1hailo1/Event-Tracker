import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  getAllCategories,
  createCategory,
  getCategoryById,
} from "../api/categoriesApi";
import type { Category, RecurrencePattern, EventVisibility } from "../types";
import LocationPicker from "./LocationPicker";

export interface EventFormValues {
  name: string;
  description?: string;
  categoryId: string;
  date: string;
  endDate?: string;
  location: string;
  latitude: number;
  longitude: number;
  maxCapacity?: number;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  visibility?: EventVisibility;
}

interface EventFormProps {
  initialData?: {
    name: string;
    description: string | null;
    categoryId: string;
    date: string;
    endDate: string | null;
    location: string;
    latitude: number;
    longitude: number;
    maxCapacity: number | null;
    isRecurring: boolean;
    recurrencePattern: RecurrencePattern | null;
    visibility: EventVisibility;
  };
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

function toDatetimeLocalValue(isoDate: string): string {
  const d = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inputClass =
  "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
const labelClass =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function EventForm({
  initialData,
  onSubmit,
  onCancel,
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
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? toDatetimeLocalValue(initialData.endDate) : "",
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
  const [frequency, setFrequency] = useState<RecurrencePattern | "NONE">(
    initialData?.isRecurring && initialData.recurrencePattern
      ? initialData.recurrencePattern
      : "NONE",
  );
  const [visibility, setVisibility] = useState<EventVisibility>(
    initialData?.visibility ?? "PUBLIC",
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getAllCategories()
      .then((cats) => {
        if (
          initialData?.categoryId &&
          !cats.some((c) => c.id === initialData.categoryId)
        ) {
          getCategoryById(initialData.categoryId)
            .then((customCat) => setCategories([...cats, customCat]))
            .catch(() => setCategories(cats));
        } else {
          setCategories(cats);
        }
      })
      .catch(console.error);
  }, [initialData?.categoryId]);

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
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        location,
        latitude,
        longitude,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
        isRecurring: frequency !== "NONE",
        recurrencePattern: frequency !== "NONE" ? frequency : undefined,
        visibility,
      });
    } catch (err) {
      setError("Failed to create/edit event");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5"
    >
      <div>
        <label className={labelClass}>Title</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className={inputClass}
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

        <div>
          <label className={labelClass}>Start date and time</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>End date and time (optional)</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={date || new Date().toISOString().slice(0, 16)}
            className={inputClass}
          />
        </div>
      </div>

      {categoryId === "CUSTOM" && (
        <div>
          <label className={labelClass}>Custom category title</label>
          <input
            type="text"
            value={customCategoryName}
            onChange={(e) => setCustomCategoryName(e.target.value)}
            required
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label className={labelClass}>Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Choose location on map</label>
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationSelect={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
            onAddressFound={(address) => setLocation(address)}
          />
        </div>
        {latitude !== null && longitude !== null && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Selected: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Capacity (optional)</label>
          <input
            type="number"
            value={maxCapacity}
            onChange={(e) => setMaxCapacity(e.target.value)}
            min={1}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Frequency</label>
          <select
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value as RecurrencePattern | "NONE")
            }
            className={inputClass}
          >
            <option value="NONE">Not recurring</option>
            <option value="DAILY">Every day</option>
            <option value="WEEKLY">Every week</option>
            <option value="MONTHLY">Every month</option>
            <option value="YEARLY">Every year</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Who can see this event?</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as EventVisibility)}
            className={inputClass}
          >
            <option value="PUBLIC">Public - anyone can see it</option>
            <option value="FOLLOWERS_ONLY">
              Followers only - only people who follow me
            </option>
            <option value="INVITE_ONLY">
              Invite only - only people I invite
            </option>
          </select>
        </div>
      </div>

      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-indigo-600 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
