import { createContext, useContext } from "react";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  sessionNotice: string;
  dismissSessionNotice: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loginWithGoogle: (credential: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside of AuthProvider");
  }
  return context;
}
