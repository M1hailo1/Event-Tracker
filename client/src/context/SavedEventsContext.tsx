import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import axiosInstance from "../api/axiosInstance";

interface SavedState {
  ids: Set<string>;
  pending: Set<string>;
  loading: boolean;
  loadError: boolean;
  revision: number;
  reload: () => void;
  toggle: (id: string) => Promise<void>;
}
const SavedContext = createContext<SavedState | null>(null);

export function SavedEventsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <AccountSavedEvents key={user?.id ?? "anonymous"} signedIn={!!user}>{children}</AccountSavedEvents>;
}

function AccountSavedEvents({ children, signedIn }: { children: ReactNode; signedIn: boolean }) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const idsRef = useRef(ids);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const [loading, setLoading] = useState(signedIn);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const reload = useCallback(() => {
    if (!signedIn || pendingRef.current.size) return;
    const request = ++generation.current;
    setLoading(true);
    axiosInstance.get<string[]>("/events/saved-ids").then(({ data }) => {
      if (request !== generation.current) return;
      idsRef.current = new Set(data);
      setIds(idsRef.current);
      setLoadError(false);
    }).catch(() => {
      if (request === generation.current) setLoadError(true);
    }).finally(() => {
      if (request === generation.current) setLoading(false);
    });
  }, [signedIn]);
  useEffect(() => {
    reload();
    window.addEventListener("focus", reload);
    return () => { ++generation.current; window.removeEventListener("focus", reload); };
  }, [reload]);

  async function toggle(id: string) {
    if (!signedIn || loading || loadError || pendingRef.current.has(id)) return;
    const saved = idsRef.current.has(id);
    pendingRef.current.add(id);
    setPending(new Set(pendingRef.current));
    try {
      if (saved) await axiosInstance.delete(`/events/${id}/save`);
      else await axiosInstance.put(`/events/${id}/save`);
      const next = new Set(idsRef.current);
      if (saved) next.delete(id); else next.add(id);
      idsRef.current = next;
      setIds(next);
      setRevision(n => n + 1);
    } finally {
      pendingRef.current.delete(id);
      setPending(new Set(pendingRef.current));
    }
  }
  return <SavedContext.Provider value={{ ids, pending, loading, loadError, revision, reload, toggle }}>{children}</SavedContext.Provider>;
}

export function useSavedEvents() {
  const context = useContext(SavedContext);
  if (!context) throw new Error("SavedEventsProvider required");
  return context;
}
