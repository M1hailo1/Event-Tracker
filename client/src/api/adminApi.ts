import axiosInstance from "./axiosInstance";
import type { AdminStats, AdminUser, Event } from "../types";
import type { CreateEventPayload } from "./eventsApi";

export async function getAdminStats(): Promise<AdminStats> {
  const response = await axiosInstance.get<AdminStats>("/admin/stats");
  return response.data;
}

export async function getAllUsersAdmin(): Promise<AdminUser[]> {
  const response = await axiosInstance.get<AdminUser[]>("/admin/users");
  return response.data;
}

export async function deleteUserAdmin(id: string): Promise<void> {
  await axiosInstance.delete(`/admin/users/${id}`);
}

export async function getAllEventsAdmin(): Promise<Event[]> {
  const response = await axiosInstance.get<Event[]>("/admin/events");
  return response.data;
}

export async function updateEventAdmin(
  id: string,
  payload: Partial<CreateEventPayload>,
): Promise<Event> {
  const response = await axiosInstance.put<Event>(
    `/admin/events/${id}`,
    payload,
  );
  return response.data;
}

export async function deleteEventAdmin(id: string): Promise<void> {
  await axiosInstance.delete(`/admin/events/${id}`);
}
