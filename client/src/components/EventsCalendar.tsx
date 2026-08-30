import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Event } from "../types";

interface EventsCalendarProps {
  events: Event[];
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfCalendarGrid(monthStart: Date): Date {
  const day = monthStart.getDay();
  const mondayIndex = (day + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - mondayIndex);
  return gridStart;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function EventsCalendar({ events }: EventsCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const monthLabel = cursor.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const days = useMemo(() => {
    const gridStart = startOfCalendarGrid(cursor);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const key = new Date(event.date).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  function goToPrevMonth() {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }
  function goToNextMonth() {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }
  function goToToday() {
    setCursor(startOfMonth(new Date()));
  }

  const today = new Date();

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline mr-2"
          >
            Today
          </button>
          <button
            onClick={goToPrevMonth}
            aria-label="Previous month"
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ‹
          </button>
          <button
            onClick={goToNextMonth}
            aria-label="Next month"
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-gray-50 dark:bg-gray-800 text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {label}
          </div>
        ))}

        {days.map((day) => {
          const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
          const isCurrentMonth = day.getMonth() === cursor.getMonth();
          const isToday = isSameDay(day, today);

          return (
            <div
              key={day.toISOString()}
              className={`bg-white dark:bg-gray-800 min-h-[90px] p-1.5 ${
                isCurrentMonth ? "" : "opacity-40"
              }`}
            >
              <span
                className={`text-xs inline-flex items-center justify-center w-5 h-5 rounded-full ${
                  isToday
                    ? "bg-indigo-600 text-white font-semibold"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {day.getDate()}
              </span>

              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="block text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded px-1 py-0.5 truncate hover:bg-indigo-100 dark:hover:bg-indigo-900"
                    title={event.name}
                  >
                    {event.name}
                  </Link>
                ))}
                {dayEvents.length > 2 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
                    +{dayEvents.length - 2} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
