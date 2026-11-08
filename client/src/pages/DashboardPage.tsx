import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyDashboard } from "../api/userApi";
import type { DashboardData } from "../types";
import EventCardGrid from "../components/EventCardGrid";
import { useAuth } from "../context/useAuth";
import { useSavedEvents } from "../context/useSavedEvents";
import { EventCardsSkeleton } from "../components/Skeleton";
import { useEventClock } from "../utils/eventLifecycle";

const dashboardTabs = [
  { id: "recommendations", label: "Recommendations" },
  { id: "explore", label: "Explore" },
  { id: "saved", label: "Saved" },
  { id: "attending", label: "Attending" },
  { id: "organized", label: "Your events" },
  { id: "following", label: "Following" },
] as const;
type DashboardTab = typeof dashboardTabs[number]["id"];

interface SectionProps {
  title: string;
  subtitle: string;
  events: DashboardData["myUpcomingEvents"];
  emptyText: string;
  hasMore: boolean;
  viewAllTo: string;
  actionTo?: string;
  actionLabel?: string;
  manageInterests?: boolean;
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
  manageInterests = false,
}: SectionProps) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        {manageInterests && <Link to="/profile" className="mt-2 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Manage your interests</Link>}
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
  const [selectedTab, setSelectedTab] = useState<DashboardTab>("recommendations");
  const [data, setData] = useState<DashboardData | null>(null);
  const { revision } = useSavedEvents();
  const lifecycleClock = useEventClock(data ? [...data.myUpcomingEvents, ...data.registeredUpcomingEvents, ...data.followingUpcomingEvents, ...(data.savedUpcomingEvents ?? []), ...(data.recommendedEvents ?? []), ...(data.exploreEvents ?? [])] : []);
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

      <div role="tablist" aria-label="Dashboard sections" className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 sm:grid-cols-3 lg:grid-cols-6 dark:border-gray-700 dark:bg-gray-800/60">
        {dashboardTabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`dashboard-tab-${tab.id}`} aria-controls={`dashboard-panel-${tab.id}`} aria-selected={selectedTab === tab.id} tabIndex={selectedTab === tab.id ? 0 : -1}
          onClick={() => setSelectedTab(tab.id)}
          onKeyDown={event => {
            let next: number;
            if (event.key === "ArrowRight") next = (index + 1) % dashboardTabs.length;
            else if (event.key === "ArrowLeft") next = (index + dashboardTabs.length - 1) % dashboardTabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = dashboardTabs.length - 1;
            else return;
            event.preventDefault();
            setSelectedTab(dashboardTabs[next].id);
            document.getElementById(`dashboard-tab-${dashboardTabs[next].id}`)?.focus();
          }}
          className={`min-w-0 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${selectedTab === tab.id ? "bg-indigo-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"}`}>{tab.label}</button>)}
      </div>
      {dashboardTabs.map(tab => <div key={tab.id} role="tabpanel" id={`dashboard-panel-${tab.id}`} aria-labelledby={`dashboard-tab-${tab.id}`} hidden={selectedTab !== tab.id} tabIndex={0} className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500">
      {selectedTab === tab.id && <>
      {tab.id === "recommendations" && <>
      <DashboardSection manageInterests title="Recommended for you" subtitle="Based on your interests, saved events and past registrations" events={data.recommendedEvents ?? []} emptyText="No matching upcoming events yet. Update your interests on your profile or browse all events." hasMore={false} viewAllTo="/" />
      </>}
      {tab.id === "explore" && <DashboardSection title="Explore something new" subtitle="Upcoming events outside the categories in your interests and activity" events={data.exploreEvents ?? []} emptyText="No different categories to explore right now. Browse all events for more options." hasMore={false} viewAllTo="/" />}
      {tab.id === "saved" && <DashboardSection
        hasMore={data.hasMore?.savedUpcomingEvents ?? false}
        viewAllTo="/saved"
        title="Saved events"
        subtitle="Events you've bookmarked for later"
        events={data.savedUpcomingEvents ?? []}
        emptyText="You haven't saved any upcoming or ongoing events."
      />}

      {tab.id === "attending" && <DashboardSection
        hasMore={data.hasMore?.registeredUpcomingEvents ?? false}
        viewAllTo="/?scope=registered"
        title="Attending"
        subtitle="Upcoming and ongoing events you're registered for"
        events={data.registeredUpcomingEvents}
        emptyText="You're not registered for any upcoming or ongoing events."
      />}

      {tab.id === "organized" && <DashboardSection
        hasMore={data.hasMore?.myUpcomingEvents ?? false}
        viewAllTo="/?scope=organized"
        title="Your events"
        subtitle="Upcoming and ongoing events you're organizing"
        events={data.myUpcomingEvents}
        emptyText="You have no upcoming or ongoing events."
        actionTo="/events/new" actionLabel="Create an event"
      />}

      {tab.id === "following" && <DashboardSection
        hasMore={data.hasMore?.followingUpcomingEvents ?? false}
        viewAllTo="/?scope=following"
        title="From people you follow"
        subtitle="Upcoming and ongoing events you haven't registered for yet"
        events={data.followingUpcomingEvents}
        emptyText="No upcoming or ongoing events from people you follow right now."
      />}
      </>}
      </div>)}
    </div>
  );
}
