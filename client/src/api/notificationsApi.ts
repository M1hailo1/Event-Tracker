import axiosInstance from "./axiosInstance";
import type { Notification } from "../types";

export async function getMyNotifications(): Promise<Notification[]> {
  const response = await axiosInstance.get<Notification[]>("/notifications");
  return response.data;
}

export async function getUnreadCount(): Promise<number> {
  const response = await axiosInstance.get<{ count: number }>(
    "/notifications/unread-count",
  );
  return response.data.count;
}

export async function markAsRead(id: string): Promise<Notification> {
  const response = await axiosInstance.patch<Notification>(
    `/notifications/${id}/read`,
  );
  return response.data;
}

export async function markAllAsRead(): Promise<void> {
  await axiosInstance.patch("/notifications/read-all");
}
