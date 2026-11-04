import { createContext, useContext } from "react";

interface SavedState {
  ids: Set<string>;
  pending: Set<string>;
  loading: boolean;
  loadError: boolean;
  revision: number;
  reload: () => void;
  toggle: (id: string) => Promise<void>;
}

export const SavedContext = createContext<SavedState | null>(null);

export function useSavedEvents() {
  const context = useContext(SavedContext);
  if (!context) throw new Error("SavedEventsProvider required");
  return context;
}
