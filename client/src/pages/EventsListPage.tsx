import { useState, useEffect } from "react";
import { getAllEvents } from "../api/eventsApi";
import type { EventSortOption } from "../api/eventsApi";
import { getAllCategories } from "../api/categoriesApi";
import type { Event, Category } from "../types";
import { useAuth } from "../context/AuthContext";
import EventCard from "../components/EventCard";

const inputClass =
  "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

const sortOptions: { value: EventSortOption; label: string }[] = [
  { value: "date_asc", label: "Date: soonest first" },
  { value: "date_desc", label: "Date: latest first" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
];

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPast, setShowPast] = useState(false);

  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<EventSortOption>("date_asc");

  const { user } = useAuth();

  useEffect(() => {
    getAllCategories()
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories", err));
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      async function fetchEvents() {
        setIsLoading(true);
        try {
          const data = await getAllEvents({
            includePast: showPast,
            categoryId: categoryId || undefined,
            city: city || undefined,
            search: search || undefined,
            sortBy,
          });
          setEvents(data);
        } catch (err) {
          setError("Mistake while loading events");
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }
      fetchEvents();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [showPast, categoryId, city, search, sortBy, user?.id]);

  function handleResetFilters() {
    setCategoryId("");
    setCity("");
    setSearch("");
    setSortBy("date_asc");
  }

  const hasActiveFilters = categoryId !== "" || city !== "" || search !== "";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {showPast ? "Event history" : "Events"}
        </h1>
        <button
          onClick={() => setShowPast(!showPast)}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          {showPast ? "Show future events" : "Show history"}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Name
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Belgrade"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as EventSortOption)}
              className={inputClass}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mt-3"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {!isLoading && events.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          {hasActiveFilters
            ? "No events match your filters."
            : "There are no events currently."}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
