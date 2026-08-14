import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import type { Notification } from "../types";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../api/notificationsApi";
import { formatRelativeTime } from "../utils/formatDate";

const POLL_INTERVAL_MS = 30000;

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
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
      setIsLoading(true);
      try {
        const data = await getMyNotifications();
        setNotifications(data);
      } catch {
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    }
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
      navigate(`/events/${notification.eventId}`);
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
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggle}
        className="relative text-gray-700 hover:text-indigo-600"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-semibold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">
              No notifications yet
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex gap-2 ${
                      notification.isRead ? "bg-white" : "bg-indigo-50"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                        notification.isRead ? "bg-transparent" : "bg-indigo-600"
                      }`}
                    />
                    <span className="flex-1">
                      <span className="block text-gray-800">
                        {notification.message}
                      </span>
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
