export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  isCustom: boolean;
  createdByUserId: string | null;
}

export type RecurrencePattern = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface Event {
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
  isInviteOnly: boolean;
  createdAt: string;
  categoryId: string;
  createdByUserId: string;
  category?: Category;
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
  id: string;
  email: string;
  name: string;
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

export interface FollowUser {
  id: string;
  name: string;
}

export interface PublicUser {
  id: string;
  name: string;
  createdAt: string;
}
