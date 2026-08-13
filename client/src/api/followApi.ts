import axiosInstance from "./axiosInstance";
import type { FollowUser } from "../types";

export async function followUser(userId: string): Promise<void> {
  await axiosInstance.post(`/users/${userId}/follow`);
}

export async function unfollowUser(userId: string): Promise<void> {
  await axiosInstance.delete(`/users/${userId}/follow`);
}

export async function getFollowers(userId: string): Promise<FollowUser[]> {
  const response = await axiosInstance.get<FollowUser[]>(
    `/users/${userId}/followers`,
  );
  return response.data;
}

export async function getFollowing(userId: string): Promise<FollowUser[]> {
  const response = await axiosInstance.get<FollowUser[]>(
    `/users/${userId}/following`,
  );
  return response.data;
}
