import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyDashboard } from "../api/userApi";
import type { DashboardData } from "../types";
import EventCard from "../components/EventCard";
import { useAuth } from "../context/AuthContext";

interface SectionProps {
  title: string;
  subtitle: string;
  events: DashboardData["myUpcomingEvents"];
  emptyText: string;
}

function DashboardSection({
  title,
  subtitle,
  events,
  emptyText,
}: SectionProps) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-6">
          {emptyText}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    async function loadDashboard() {
      setIsLoading(true);
      try {
        const dashboardData = await getMyDashboard();
        setData(dashboardData);
      } catch (err) {
        setError("Failed to load dashboard");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [user]);

  if (!user) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        You must be logged in to view your dashboard.
      </p>
    );
  }

  if (isLoading)
    return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <Link
          to="/events/new"
          className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Create event
        </Link>
      </div>

      <DashboardSection
        title="Attending"
        subtitle="Upcoming events you're registered for"
        events={data.registeredUpcomingEvents}
        emptyText="You're not registered for any upcoming events yet."
      />

      <DashboardSection
        title="Your events"
        subtitle="Upcoming events you're organizing"
        events={data.myUpcomingEvents}
        emptyText="You haven't created any upcoming events."
      />

      <DashboardSection
        title="From people you follow"
        subtitle="Upcoming events you haven't registered for yet"
        events={data.followingUpcomingEvents}
        emptyText="No upcoming events from people you follow right now."
      />
    </div>
  );
}
