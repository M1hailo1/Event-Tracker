import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyDashboard } from "../api/userApi";
import type { DashboardData } from "../types";
import EventCardGrid from "../components/EventCardGrid";
import { useAuth } from "../context/useAuth";
import { useSavedEvents } from "../context/useSavedEvents";
import { EventCardsSkeleton } from "../components/Skeleton";
import { useEventClock } from "../utils/eventLifecycle";

interface SectionProps {
  title: string;
  subtitle: string;
  events: DashboardData["myUpcomingEvents"];
  emptyText: string;
  hasMore: boolean;
  viewAllTo: string;
  actionTo?: string;
  actionLabel?: string;
}

function DashboardSection({
  title,
  subtitle,
  events,
  emptyText,
  actionTo = "/",
  actionLabel = "Explore events",
  viewAllTo,
  hasMore,
}: SectionProps) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>

      {events.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-6">
          <p className="mb-3">{emptyText}</p><Link to={actionTo} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">{actionLabel}</Link>
        </div>
      ) : (
        <div><EventCardGrid events={events} />{hasMore && <Link to={viewAllTo} className="mt-4 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">View all</Link>}</div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const { revision } = useSavedEvents();
  const lifecycleClock = useEventClock(data ? [...data.myUpcomingEvents, ...data.registeredUpcomingEvents, ...data.followingUpcomingEvents, ...(data.savedUpcomingEvents ?? [])] : []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");
      try {
        const dashboardData = await getMyDashboard();
        if (active) setData(dashboardData);
      } catch (err) {
        if (active) setError("Failed to load dashboard");
        console.error(err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => { active = false; };
  }, [user, lifecycleClock, revision]);

  if (authLoading && !user) return <EventCardsSkeleton />;
  if (!user) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        You must be logged in to view your dashboard.
      </p>
    );
  }

  if (isLoading && !data) return <EventCardsSkeleton />;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <Link
          to="/events/new"
          className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Create event
        </Link>
      </div>

      <DashboardSection
        hasMore={data.hasMore?.savedUpcomingEvents ?? false}
        viewAllTo="/saved"
        title="Saved events"
        subtitle="Events you've bookmarked for later"
        events={data.savedUpcomingEvents ?? []}
        emptyText="You haven't saved any upcoming or ongoing events."
      />

      <DashboardSection
        hasMore={data.hasMore?.registeredUpcomingEvents ?? false}
        viewAllTo="/?scope=registered"
        title="Attending"
        subtitle="Upcoming and ongoing events you're registered for"
        events={data.registeredUpcomingEvents}
        emptyText="You're not registered for any upcoming or ongoing events."
      />

      <DashboardSection
        hasMore={data.hasMore?.myUpcomingEvents ?? false}
        viewAllTo="/?scope=organized"
        title="Your events"
        subtitle="Upcoming and ongoing events you're organizing"
        events={data.myUpcomingEvents}
        emptyText="You have no upcoming or ongoing events."
        actionTo="/events/new" actionLabel="Create an event"
      />

      <DashboardSection
        hasMore={data.hasMore?.followingUpcomingEvents ?? false}
        viewAllTo="/?scope=following"
        title="From people you follow"
        subtitle="Upcoming and ongoing events you haven't registered for yet"
        events={data.followingUpcomingEvents}
        emptyText="No upcoming or ongoing events from people you follow right now."
      />
    </div>
  );
}
