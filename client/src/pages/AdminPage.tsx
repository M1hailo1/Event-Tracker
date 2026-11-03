import { getEventCategories } from "../utils/eventCategories";
import ModeratorRoleModal from "../components/ModeratorRoleModal";
import { useConfirmAction } from "../components/ConfirmDialog";
import SearchableSelect from "../components/SearchableSelect";
import { isStaff } from "../utils/roles";
import CommentReportsTab from "../components/CommentReportsTab";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAdminStats,
  setModeratorRole,
  getAllUsersAdmin,
  banUserAdmin,
  unbanUserAdmin,
  getAllEventsAdmin,
  deleteEventAdmin,
} from "../api/adminApi";
import { getAllCategories } from "../api/categoriesApi";
import type {
  AdminStats,
  AdminUser,
  Event,
  Category,
  BanDuration,
  EventVisibility,
} from "../types";
import { formatEventDate } from "../utils/formatDate";
import LoadingBlock from "../components/LoadingBlock";
import BanUserModal from "../components/BanUserModal";

type Tab = "overview" | "users" | "events" | "reports";

const inputClass =
  "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

const visibilityLabels: Record<EventVisibility, string> = {
  PUBLIC: "Public",
  FOLLOWERS_ONLY: "Followers only",
  INVITE_ONLY: "Invite only",
};

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
  if (!stats) return <LoadingBlock label="Loading stats..." />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="Total users" value={stats.userCount} />
      <StatCard label="Admins" value={stats.adminCount} />
      <StatCard label="Moderators" value={stats.moderatorCount} />
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

// --- Ban status helpers ---

function isActivelyBanned(bannedUntil: string | null): boolean {
  if (!bannedUntil) return false;
  return new Date(bannedUntil).getTime() > Date.now();
}

function isPermanentBan(bannedUntil: string | null): boolean {
  if (!bannedUntil) return false;
  return new Date(bannedUntil).getFullYear() >= 9999;
}

function formatBanStatus(bannedUntil: string | null): string {
  if (!isActivelyBanned(bannedUntil)) return "Active";
  if (isPermanentBan(bannedUntil)) return "Banned permanently";
  return `Banned until ${new Date(bannedUntil!).toLocaleString("en-GB")}`;
}

function BanStatusBadge({ bannedUntil }: { bannedUntil: string | null }) {
  const banned = isActivelyBanned(bannedUntil);
  return banned ? (
    <span className="text-xs font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-2 py-1 rounded-full whitespace-nowrap">
      {formatBanStatus(bannedUntil)}
    </span>
  ) : (
    <span className="text-xs font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">
      Active
    </span>
  );
}

// --- Users tab ---

type RoleFilter = "all" | "USER" | "MODERATOR" | "ADMIN";
type StatusFilter = "all" | "active" | "banned";

function UsersTab() {
  const { confirm, confirmationDialog } = useConfirmAction();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [banningUser, setBanningUser] = useState<AdminUser | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);

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

  async function handleBanConfirm(duration: BanDuration, reason: string) {
    if (!banningUser) return;
    const target = banningUser;
    const updated = await banUserAdmin(target.id, duration, reason);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
    setBanningUser(null);
  }

  async function handleUnban(targetUser: AdminUser) {
    confirm({ title: "Unban user?", message: `Restore access for ${targetUser.name}?`, confirmLabel: "Unban", action: async () => {
      const updated = await unbanUserAdmin(targetUser.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)),
      );
    } });
  }

  if (isLoading) return <LoadingBlock label="Loading users..." />;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;

  const filteredUsers = users.filter((u) => {
    const banned = isActivelyBanned(u.bannedUntil);

    const matchesSearch =
      search.trim() === "" ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || u.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" || (statusFilter === "banned" ? banned : !banned);

    return matchesSearch && matchesRole && matchesStatus;
  });

  async function handleRoleChange(target: AdminUser) {
    const role = target.role === "MODERATOR" ? "USER" : "MODERATOR";
    setChangingRole(target.id);
    try {
      const updated = await setModeratorRole(target.id, role);
      setUsers(previous => previous.map(item => item.id === updated.id ? { ...item, ...updated } : item));
      setRoleTarget(null);
    } finally {
      setChangingRole(null);
    }
  }

  function RoleAction({ targetUser }: { targetUser: AdminUser }) {
    if (currentUser?.role !== "ADMIN" || targetUser.role === "ADMIN") return null;
    return <button type="button" disabled={changingRole !== null} onClick={() => setRoleTarget(targetUser)} className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium whitespace-nowrap text-indigo-700 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900">
      {changingRole === targetUser.id ? "Saving..." : targetUser.role === "MODERATOR" ? "Remove moderator" : "Make moderator"}
    </button>;
  }

  function BanAction({ targetUser }: { targetUser: AdminUser }) {
    if (targetUser.id === currentUser?.id || (currentUser?.role === "MODERATOR" && targetUser.role === "ADMIN")) return null;
    return isActivelyBanned(targetUser.bannedUntil) ? (
      <button
        onClick={() => handleUnban(targetUser)}
        className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium whitespace-nowrap text-emerald-700 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
      >
        Unban
      </button>
    ) : (
      <button
        onClick={() => setBanningUser(targetUser)}
        className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium whitespace-nowrap text-red-700 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-500 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
      >
        Ban
      </button>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className={inputClass}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className={inputClass}
        >
          <option value="all">All roles</option>
          <option value="USER">Users</option>
          <option value="MODERATOR">Moderators</option>
          <option value="ADMIN">Admins</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className={inputClass}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="w-48 px-4 py-3 font-medium">Actions</th>
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
                  <p className="mt-1 max-w-56 break-words text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  {isStaff(u.role) ? (
                    <span className="text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full whitespace-nowrap">
                      {u.role === "ADMIN" ? "Admin" : "Moderator"}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      User
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <BanStatusBadge bannedUntil={u.bannedUntil} />
                  {isActivelyBanned(u.bannedUntil) && u.banReason && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Reason: {u.banReason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  <p className="whitespace-nowrap">{u._count.events} events</p>
                  <p className="mt-1 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{u._count.registrations} registrations</p>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(u.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="w-48 px-4 py-3">
                  <div className="flex min-w-40 flex-col gap-2">
                    <BanAction targetUser={u} />
                    <RoleAction targetUser={u} />
                  </div>
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((u) => (
          <div
            key={u.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <Link
                  to={`/users/${u.id}`}
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {u.name}
                </Link>
                <p className="break-words text-xs text-gray-500 dark:text-gray-400">
                  {u.email}
                </p>
              </div>
              {isStaff(u.role) && (
                <span className="text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full whitespace-nowrap">
                  {u.role === "ADMIN" ? "Admin" : "Moderator"}
                </span>
              )}
            </div>

            <div className="mb-3">
              <BanStatusBadge bannedUntil={u.bannedUntil} />
              {isActivelyBanned(u.bannedUntil) && u.banReason && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">Reason: {u.banReason}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
              <span>{u._count.events} events</span>
              <span>{u._count.registrations} registrations</span>
              <span>
                Joined {new Date(u.createdAt).toLocaleDateString("en-GB")}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700 [&>button]:w-auto [&>button]:flex-1">
              <BanAction targetUser={u} />
              <RoleAction targetUser={u} />
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
            No users match your filters.
          </p>
        )}
      </div>

      {confirmationDialog}
      {roleTarget && <ModeratorRoleModal userName={roleTarget.name} removing={roleTarget.role === "MODERATOR"}
        onCancel={() => setRoleTarget(null)} onConfirm={() => handleRoleChange(roleTarget)} />}
      {banningUser && (
        <BanUserModal
          userName={banningUser.name}
          onCancel={() => setBanningUser(null)}
          onConfirm={handleBanConfirm}
        />
      )}
    </div>
  );
}

// --- Events tab ---

type VisibilityFilter = "all" | EventVisibility;

function EventsTab() {
  const { confirm, confirmationDialog } = useConfirmAction();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

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

  useEffect(() => {
    getAllCategories()
      .then(setCategories)
      .catch((err) => console.error("Failed to load categories", err));
  }, []);

  async function handleDelete(id: string, name: string) {
    confirm({ title: "Delete event?", message: `Permanently delete “${name}”? This cannot be undone.`, confirmLabel: "Delete event", danger: true, action: async () => {
      await deleteEventAdmin(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } });
  }

  if (isLoading) return <LoadingBlock label="Loading events..." />;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      search.trim() === "" ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.createdBy?.name.toLowerCase().includes(search.toLowerCase()) ?? false);

    const matchesCategory = categoryId === "" || getEventCategories(e).some(category => category.id === categoryId);

    const matchesVisibility =
      visibilityFilter === "all" || e.visibility === visibilityFilter;

    return matchesSearch && matchesCategory && matchesVisibility;
  });

  return (
    <div>
      {confirmationDialog}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by event or organizer..."
          className={inputClass}
        />
        <SearchableSelect label="Category" hideLabel value={categoryId} onChange={setCategoryId}
          options={[{ value: "", label: "All categories" }, ...categories.map(category => ({ value: category.id, label: category.name }))]} />
        <select
          value={visibilityFilter}
          onChange={(e) =>
            setVisibilityFilter(e.target.value as VisibilityFilter)
          }
          className={inputClass}
        >
          <option value="all">All visibilities</option>
          <option value="PUBLIC">Public</option>
          <option value="FOLLOWERS_ONLY">Followers only</option>
          <option value="INVITE_ONLY">Invite only</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Organizer</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Visibility</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Registrations</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((e) => (
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
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {e.createdBy?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {getEventCategories(e).map(category => category.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {visibilityLabels[e.visibility]}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatEventDate(e.date)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {e._count?.registrations ?? 0}
                </td>
                <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
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

        {filteredEvents.length === 0 && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
            No events match your filters.
          </p>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filteredEvents.map((e) => (
          <div
            key={e.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
          >
            <Link
              to={`/events/${e.id}`}
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {e.name}
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              by {e.createdBy?.name ?? "—"} · {getEventCategories(e).map(category => category.name).join(", ") || "—"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatEventDate(e.date)} · {visibilityLabels[e.visibility]}
            </p>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {e._count?.registrations ?? 0} registrations
              </span>
              <div className="space-x-3">
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
              </div>
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
            No events match your filters.
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (authLoading && !user) return <LoadingBlock label="Loading admin panel..." />;
  if (!user) {
    return (
      <p className="text-gray-500 dark:text-gray-400">You must be logged in.</p>
    );
  }

  if (!isStaff(user.role)) {
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
    { key: "reports", label: "Comment reports" },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {user.role === "ADMIN" ? "Admin" : "Moderator"}
      </h1>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
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
      {tab === "reports" && <CommentReportsTab />}
    </div>
  );
}
