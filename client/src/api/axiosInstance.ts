import axios from "axios";
import { endSession } from "../utils/session";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(response => response, error => {
  const authorization = error.config?.headers?.Authorization;
  const requestedToken = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  const path = String(error.config?.url ?? "").split("?")[0];
  if (error.response?.status === 401 && requestedToken && !path.startsWith("/auth/")) endSession(requestedToken);
  return Promise.reject(error);
});

export default axiosInstance;
