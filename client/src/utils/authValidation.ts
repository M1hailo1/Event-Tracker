import { isAxiosError } from "axios";

export function passwordError(password: string, registering = false): string {
  if (new TextEncoder().encode(password).length > 72) return "This password is too long. Try a shorter password.";
  if (registering && Array.from(password).length < 8) return "Use at least 8 characters for your password.";
  return "";
}

export function authError(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  const detail = error.response?.data?.error;
  if (typeof detail === "string") return detail;
  if (detail?.fieldErrors && typeof detail.fieldErrors === "object") {
    const message = Object.values(detail.fieldErrors).flat().find(value => typeof value === "string");
    if (typeof message === "string") return message;
  }
  if (!error.response) return "Unable to reach the server. Check your connection and try again.";
  return fallback;
}
