import axiosInstance from "./axiosInstance";
import type { Role } from "../types";

export interface EventComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  parentId: string | null;
  user: { id: string; name: string; role: Role } | null;
  _count: { replies: number };
}
export interface CommentPage { comments: EventComment[]; nextCursor: string | null; }
export async function getComments(eventId: string, parentId?: string, cursor?: string, targetId?: string): Promise<CommentPage> {
  const { data } = await axiosInstance.get<CommentPage>(`/events/${eventId}/comments`, { params: { parentId, cursor, targetId } });
  return data;
}
export async function createComment(eventId: string, body: string, parentId?: string): Promise<EventComment> {
  const { data } = await axiosInstance.post<EventComment>(`/events/${eventId}/comments`, { body, parentId });
  return data;
}
export async function updateComment(eventId: string, id: string, body: string) {
  await axiosInstance.put(`/events/${eventId}/comments/${id}`, { body });
}
export async function deleteComment(eventId: string, id: string) {
  await axiosInstance.delete(`/events/${eventId}/comments/${id}`);
}
export type ReportReason = "HARASSMENT" | "SPAM" | "INAPPROPRIATE" | "OTHER";
export async function reportComment(eventId: string, commentId: string, reason: ReportReason, details: string) {
  await axiosInstance.post(`/events/${eventId}/comments/${commentId}/reports`, { reason, details });
}
