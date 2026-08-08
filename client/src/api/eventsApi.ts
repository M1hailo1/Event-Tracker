import axiosInstance from "./axiosInstance";
import type { Event } from "../types";

export async function getAllEvents(): Promise<Event[]> {
  const response = await axiosInstance.get<Event[]>("/events");
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
  isInviteOnly?: boolean;
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
