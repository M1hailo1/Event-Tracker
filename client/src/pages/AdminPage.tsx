import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAdminStats,
  getAllUsersAdmin,
  banUserAdmin,
  unbanUserAdmin,
  getAllEventsAdmin,
  deleteEventAdmin,
} from "../api/adminApi";
import type { AdminStats, AdminUser, Event } from "../types";
import { formatEventDate } from "../utils/formatDate";

type Tab = "overview" | "users" | "events";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </p>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => {
        setError("Failed to load stats");
        console.error(err);
      });
  }, []);

  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!stats)
    return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="Users" value={stats.userCount} />
      <StatCard label="Events" value={stats.eventCount} />
      <StatCard label="Upcoming events" value={stats.upcomingEventCount} />
      <StatCard
        label="Confirmed registrations"
        value={stats.registrationCount}
      />
      <StatCard label="Categories" value={stats.categoryCount} />
    </div>
  );
}

type RoleFilter = "all" | "USER" | "ADMIN";
type StatusFilter = "all" | "active" | "banned";

function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  function loadUsers() {
    setIsLoading(true);
    getAllUsersAdmin()
      .then(setUsers)
      .catch((err) => {
        setError("Failed to load users");
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(loadUsers, []);

  async function handleBanToggle(targetUser: AdminUser) {
    const action = targetUser.isBanned ? "Unban" : "Ban";
    if (!confirm(`${action} ${targetUser.name}?`)) return;

    try {
      const updated = targetUser.isBanned
        ? await unbanUserAdmin(targetUser.id)
        : await banUserAdmin(targetUser.id);

      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
      );
    } catch (err) {
      alert(`Failed to ${action.toLowerCase()} user`);
      console.error(err);
    }
  }

  if (isLoading)
    return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      search.trim() === "" ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || u.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "banned" ? u.isBanned : !u.isBanned);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All roles</option>
          <option value="USER">Users</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Events</th>
              <th className="px-4 py-3 font-medium">Registrations</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr
                key={u.id}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/users/${u.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {u.email}
                </td>
                <td className="px-4 py-3">
                  {u.role === "ADMIN" ? (
                    <span className="text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">
                      Admin
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      User
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.isBanned ? (
                    <span className="text-xs font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-2 py-1 rounded-full">
                      Banned
                    </span>
                  ) : (
                    <span className="text-xs font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {u._count.events}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {u._count.registrations}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleBanToggle(u)}
                      className={
                        u.isBanned
                          ? "text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                          : "text-sm text-red-600 dark:text-red-400 hover:underline"
                      }
                    >
                      {u.isBanned ? "Unban" : "Ban"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
            No users match your filters.
          </p>
        )}
      </div>
    </div>
  );
}

function EventsTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  function loadEvents() {
    setIsLoading(true);
    getAllEventsAdmin()
      .then(setEvents)
      .catch((err) => {
        setError("Failed to load events");
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(loadEvents, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;

    try {
      await deleteEventAdmin(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert("Failed to delete event");
      console.error(err);
    }
  }

  if (isLoading)
    return <p className="text-gray-500 dark:text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Organizer</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Registrations</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr
              key={e.id}
              className="border-t border-gray-100 dark:border-gray-800"
            >
              <td className="px-4 py-3">
                <Link
                  to={`/events/${e.id}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {e.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {e.createdBy?.name ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {e.category?.name ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                {formatEventDate(e.date)}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {e._count?.registrations ?? 0}
              </td>
              <td className="px-4 py-3 text-right space-x-3">
                <Link
                  to={`/events/${e.id}/edit`}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(e.id, e.name)}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (!user) {
    return (
      <p className="text-gray-500 dark:text-gray-400">You must be logged in.</p>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        You don't have access to this page.
      </p>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "Users" },
    { key: "events", label: "Events" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Admin
      </h1>

      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key
                ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "users" && <UsersTab />}
      {tab === "events" && <EventsTab />}
    </div>
  );
}
