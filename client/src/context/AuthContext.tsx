import type { User } from "../types";
import { AuthContext } from "./useAuth";
import { getMyProfile } from "../api/userApi";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { loginUser, registerUser, googleAuthRequest } from "../api/authApi";
import { endSession, SESSION_ENDED, tokenExpiresAt } from "../utils/session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!storedUser || !token) { localStorage.removeItem("user"); localStorage.removeItem("token"); return null; }
    const expiresAt = tokenExpiresAt(token);
    if (expiresAt === null || expiresAt <= Date.now()) {
      localStorage.removeItem("token"); localStorage.removeItem("user"); return null;
    }
    try {
      const cached = JSON.parse(storedUser);
      if (!cached || typeof cached.id !== "string" || typeof cached.name !== "string" || typeof cached.email !== "string" || !["USER", "MODERATOR", "ADMIN"].includes(cached.role)) throw new Error("Invalid cached user");
      return cached as User;
    } catch { localStorage.removeItem("user"); localStorage.removeItem("token"); return null; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState("");

  useEffect(() => {
    function onSessionEnded(event: Event) {
      setUser(null);
      if ((event as CustomEvent<{ notify: boolean }>).detail?.notify) setSessionNotice("Your session has ended. Please sign in again.");
    }
    function onStorage(event: StorageEvent) {
      if (event.key === "token" && !event.newValue) setUser(null);
    }
    window.addEventListener(SESSION_ENDED, onSessionEnded);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(SESSION_ENDED, onSessionEnded); window.removeEventListener("storage", onStorage); };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user || !token) return;
    const expiresAt = tokenExpiresAt(token);
    if (expiresAt === null) return;
    const timer = window.setTimeout(() => endSession(token), Math.max(0, Math.min(expiresAt - Date.now(), 2147483647)));
    return () => window.clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    let active = true;
    async function refreshUser() {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      try {
        if (!storedUser || !token) return;
        const profile = await getMyProfile();
        if (!active || token !== localStorage.getItem("token")) return;
        const current = { id: profile.id, email: profile.email, name: profile.name, role: profile.role };
        localStorage.setItem("user", JSON.stringify(current));
        setUser(current);
      } catch { return; } finally {
        if (active) setIsLoading(false);
      }
    }
    void refreshUser();
    window.addEventListener("focus", refreshUser);
    return () => { active = false; window.removeEventListener("focus", refreshUser); };
  }, []);

  async function login(email: string, password: string) {
    const response = await loginUser(email, password);
    localStorage.setItem("token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
    setSessionNotice("");
  }

  async function register(email: string, password: string, name: string) {
    const response = await registerUser(email, password, name);
    localStorage.setItem("token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
    setSessionNotice("");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setSessionNotice("");
  }

  async function loginWithGoogle(credential: string) {
    const response = await googleAuthRequest(credential);
    localStorage.setItem("token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
    setSessionNotice("");
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, sessionNotice, dismissSessionNotice: () => setSessionNotice(""), login, register, logout, loginWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  );
}
