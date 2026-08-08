import axiosInstance from "./axiosInstance";
import type { UserProfile, UserStats } from "../types";

export async function getMyProfile(): Promise<UserProfile> {
  const response = await axiosInstance.get<UserProfile>("/users/me");
  return response.data;
}

export async function getMyStats(): Promise<UserStats> {
  const response = await axiosInstance.get<UserStats>("/users/me/stats");
  return response.data;
}
