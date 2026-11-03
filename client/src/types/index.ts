export interface RatingSummary { average: number | null; count: number; }

export type Role = "USER" | "MODERATOR" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Category {
  id: string;
  name: string;
  isCustom: boolean;
  createdByUserId: string | null;
}

export type RecurrencePattern = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type EventVisibility = "PUBLIC" | "FOLLOWERS_ONLY" | "INVITE_ONLY";

export interface Event {
  cancelledAt?: string | null;
  recurrenceStopped?: boolean;
  coverId?: string | null;
  rating?: RatingSummary;
  myRating?: number | null;
  id: string;
  name: string;
  description: string | null;
  date: string;
  endDate: string | null;
  location: string;
  latitude: number;
  longitude: number;
  maxCapacity: number | null;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern | null;
  visibility: EventVisibility;
  createdAt: string;
  categoryId: string;
  createdByUserId: string;
  category?: Category;
  categories?: Category[];
  createdBy?: { id: string; name: string };
  _count?: { registrations: number };
  registrations?: Registration[];
}

export interface Registration {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  registeredAt: string;
  userId: string;
  eventId: string;
  user?: { id: string; name: string };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface UserProfile {
  organizerRating?: RatingSummary;
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface CategoryCount {
  categoryId: string;
  name: string;
  count: number;
}

export interface UserStats {
  totalEvents: number;
  categoryCounts: CategoryCount[];
  topCategory: CategoryCount | null;
}

export interface DashboardData {
  hasMore: { myUpcomingEvents: boolean; registeredUpcomingEvents: boolean; followingUpcomingEvents: boolean };
  myUpcomingEvents: Event[];
  registeredUpcomingEvents: Event[];
  followingUpcomingEvents: Event[];
}

export interface FollowUser {
  id: string;
  name: string;
}

export interface PublicUser {
  organizerRating?: RatingSummary;
  id: string;
  name: string;
  role: Role;
  createdAt: string;
  bannedUntil?: string | null;
}

export type NotificationType =
  | "NEW_EVENT_FROM_FOLLOWED"
  | "EVENT_UPDATED"
  | "EVENT_CANCELLED"
  | "EVENT_REMINDER"
  | "EVENT_JOINED"
  | "EVENT_RATING_PROMPT"
  | "NEW_FOLLOWER"
  | "EVENT_INVITE"
  | "EVENT_COMMENT"
  | "COMMENT_REPLY";

export interface Notification {
  commentId?: string | null;
  activityCount: number;
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  eventId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AdminStats {
  adminCount: number;
  moderatorCount: number;
  userCount: number;
  eventCount: number;
  upcomingEventCount: number;
  registrationCount: number;
  categoryCount: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  bannedUntil: string | null;
  banReason: string | null;
  createdAt: string;
  _count: { events: number; registrations: number };
}

export type BanDuration = "1h" | "1w" | "1m" | "forever";
