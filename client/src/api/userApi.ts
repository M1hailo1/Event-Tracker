import axiosInstance from "./axiosInstance";
import type {
  UserProfile,
  UserStats,
  PublicUser,
  DashboardData,
} from "../types";

export async function getMyProfile(): Promise<UserProfile> {
  const response = await axiosInstance.get<UserProfile>("/users/me");
  return response.data;
}

export async function getMyStats(): Promise<UserStats> {
  const response = await axiosInstance.get<UserStats>("/users/me/stats");
  return response.data;
}

export async function getMyDashboard(): Promise<DashboardData> {
  const response = await axiosInstance.get<DashboardData>(
    "/users/me/dashboard",
  );
  return response.data;
}

export async function getUserById(id: string): Promise<PublicUser> {
  const response = await axiosInstance.get<PublicUser>(`/users/${id}`);
  return response.data;
}
