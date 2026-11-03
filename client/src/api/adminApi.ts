import axiosInstance from "./axiosInstance";
import type { AdminStats, AdminUser, Event, BanDuration, Role } from "../types";
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

export async function banUserAdmin(
  id: string,
  duration: BanDuration,
  reason?: string,
): Promise<AdminUser> {
  const response = await axiosInstance.patch<AdminUser>(
    `/admin/users/${id}/ban`,
    { duration, reason },
  );
  return response.data;
}

export async function unbanUserAdmin(id: string): Promise<AdminUser> {
  const response = await axiosInstance.patch<AdminUser>(
    `/admin/users/${id}/unban`,
  );
  return response.data;
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

export async function cancelEventAdmin(id: string, scope: "OCCURRENCE" | "SERIES" = "OCCURRENCE"): Promise<Event> {
  const response = await axiosInstance.post<Event>(`/admin/events/${id}/cancel`, { scope });
  return response.data;
}
export type ReportStatus = "OPEN" | "DISMISSED" | "REMOVED";
export interface CommentReport {
  id: string; reason: string; details: string | null; bodySnapshot: string; status: ReportStatus;
  createdAt: string; reviewedAt: string | null;
  reporter: { id: string; name: string };
  comment: { id: string; body: string; deletedAt: string | null;
    user: { id: string; name: string; role: Role };
    event: { id: string; name: string } };
}
export async function getCommentReports(status: ReportStatus, cursor?: string): Promise<{ reports: CommentReport[]; nextCursor: string | null }> {
  const { data } = await axiosInstance.get("/admin/comment-reports", { params: { status, cursor } });
  return data;
}
export async function reviewCommentReport(id: string, action: "DISMISS" | "REMOVE") {
  await axiosInstance.patch(`/admin/comment-reports/${id}`, { action });
}

export async function setModeratorRole(id: string, role: "USER" | "MODERATOR"): Promise<Pick<AdminUser, "id" | "role">> {
  const { data } = await axiosInstance.patch(`/admin/users/${id}/role`, { role });
  return data;
}
