import axiosInstance from "./axiosInstance";
import type { AuthResponse } from "../types";

export async function registerUser(
  email: string,
  password: string,
  name: string,
): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>("/auth/register", {
    email,
    password,
    name,
  });
  return response.data;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  return response.data;
}

export async function googleAuthRequest(
  credential: string,
): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>("/auth/google", {
    credential,
  });
  return response.data;
}
