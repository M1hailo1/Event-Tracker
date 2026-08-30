import axiosInstance from "./axiosInstance";
import type { Event, EventVisibility, FollowUser } from "../types";

export type EventSortOption =
  | "date_asc"
  | "date_desc"
  | "name_asc"
  | "name_desc";

export interface EventFilters {
  includePast?: boolean;
  categoryId?: string;
  city?: string;
  search?: string;
  sortBy?: EventSortOption;
  attendedOnly?: boolean;
}

export async function getAllEvents(
  filters: EventFilters = {},
): Promise<Event[]> {
  const params: Record<string, string> = {};
  if (filters.includePast) params.includePast = "true";
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.city) params.city = filters.city;
  if (filters.search) params.search = filters.search;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.attendedOnly) params.attendedOnly = "true";

  const response = await axiosInstance.get<Event[]>("/events", { params });
  return response.data;
}

export async function getEventById(id: string): Promise<Event> {
  const response = await axiosInstance.get<Event>(`/events/${id}`);
  return response.data;
}

export interface CreateEventPayload {
  name: string;
  description?: string;
  categoryId: string;
  date: string;
  location: string;
  latitude: number;
  longitude: number;
  maxCapacity?: number;
  isRecurring?: boolean;
  recurrencePattern?: string;
  visibility?: EventVisibility;
}

export async function createEvent(payload: CreateEventPayload): Promise<Event> {
  const response = await axiosInstance.post<Event>("/events", payload);
  return response.data;
}

export async function registerForEvent(eventId: string): Promise<void> {
  await axiosInstance.post(`/events/${eventId}/register`);
}

export async function unregisterFromEvent(eventId: string): Promise<void> {
  await axiosInstance.delete(`/events/${eventId}/register`);
}

export async function deleteEvent(id: string): Promise<void> {
  await axiosInstance.delete(`/events/${id}`);
}

export async function updateEvent(
  id: string,
  payload: Partial<CreateEventPayload>,
): Promise<Event> {
  const response = await axiosInstance.put<Event>(`/events/${id}`, payload);
  return response.data;
}

export async function inviteUserToEvent(
  eventId: string,
  userId: string,
): Promise<void> {
  await axiosInstance.post(`/events/${eventId}/invites`, { userId });
}

export async function getEventInvites(eventId: string): Promise<FollowUser[]> {
  const response = await axiosInstance.get<FollowUser[]>(
    `/events/${eventId}/invites`,
  );
  return response.data;
}
