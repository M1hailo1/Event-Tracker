import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import type { Notification } from "../types";
import {
  getNotificationPage,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  EVENT_NOTIFICATIONS_READ,
} from "../api/notificationsApi";
import { formatRelativeTime } from "../utils/formatDate";
import LoadingBlock from "./LoadingBlock";

const POLL_INTERVAL_MS = 120000;

export default function NotificationBell() {
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const panelId = useId();

  async function refreshUnreadCount() {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {}
  }

  useEffect(() => {
    async function fetchInitialCount() {
      await refreshUnreadCount();
    }
    fetchInitialCount();

    let interval: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (interval) return;
      interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopPolling();
      } else {
        refreshUnreadCount();
        startPolling();
      }
    }

    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    function handleEventRead(event: Event) {
      const eventId = (event as CustomEvent<string>).detail;
      setNotifications((prev) =>
        prev.map((n) => n.eventId === eventId ? { ...n, isRead: true } : n),
      );
      void refreshUnreadCount();
    }
    window.addEventListener(EVENT_NOTIFICATIONS_READ, handleEventRead);
    return () => window.removeEventListener(EVENT_NOTIFICATIONS_READ, handleEventRead);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleToggle() {
    const willOpen = !isOpen;
    setIsOpen(willOpen);

    if (willOpen) {
      setIsLoading(true); setError(""); setPage(0); setHasMore(false);
      try {
        const data = await getNotificationPage();
        setNotifications(data.items); setPage(1); setHasMore(data.totalPages > 1);
      } catch {
        setNotifications([]); setError("Unable to load notifications.");
      } finally {
        setIsLoading(false);
      }
    }
  }

  async function loadMore() {
    setLoadingMore(true); setError("");
    try { const data = await getNotificationPage(page + 1); setNotifications(previous => [...new Map([...previous, ...data.items].map(item => [item.id, item])).values()]); setPage(data.page); setHasMore(data.page < data.totalPages); }
    catch { setError("Unable to load notifications."); }
    finally { setLoadingMore(false); }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }

    setIsOpen(false);
    if (notification.eventId) {
      navigate(`/events/${notification.eventId}${notification.commentId ? `?comment=${notification.commentId}` : ""}`);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }

  return (
    <div className="relative" ref={containerRef} onKeyDown={event => {
      if (event.key === "Escape") { setIsOpen(false); containerRef.current?.querySelector("button")?.focus(); }
    }}>
      <button
        onClick={handleToggle}
        className="relative text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-semibold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div id={panelId} className="fixed right-4 top-16 md:absolute md:right-0 md:top-auto mt-3 w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                Mark all as read
              </button>
            )}
          </div>

          {error && <p role="alert" className="px-4 py-2 text-sm text-red-600">{error}</p>}
          {isLoading ? (
            <LoadingBlock label="Loading..." size={20} compact />
          ) : notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
              {error ? "" : "No notifications yet"}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex gap-2 ${
                      notification.isRead
                        ? "bg-white dark:bg-gray-800"
                        : "bg-indigo-50 dark:bg-indigo-950"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                        notification.isRead
                          ? "bg-transparent"
                          : "bg-indigo-600 dark:bg-indigo-400"
                      }`}
                    />
                    <span className="flex-1">
                      <span className="block text-gray-800 dark:text-gray-200">
                        {notification.message}
                        {notification.type !== "EVENT_JOINED" && notification.activityCount > 1 && ` (${notification.activityCount})`}
                      </span>
                      <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(hasMore || error) && <button disabled={isLoading || loadingMore} onClick={loadMore} className="w-full px-4 py-3 text-sm text-indigo-600 dark:text-indigo-400 disabled:opacity-50">{loadingMore ? "Loading?" : error ? "Try again" : "Load more"}</button>}
        </div>
      )}
    </div>
  );
}
