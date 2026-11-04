import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function SessionNotice() {
  const { sessionNotice, dismissSessionNotice } = useAuth();
  if (!sessionNotice) return null;
  return <div role="status" className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
    <span>{sessionNotice}</span>
    <Link to="/login" className="font-semibold underline">Sign in</Link>
    <button type="button" onClick={dismissSessionNotice} className="ml-auto rounded px-2 py-1 underline">Dismiss</button>
  </div>;
}
