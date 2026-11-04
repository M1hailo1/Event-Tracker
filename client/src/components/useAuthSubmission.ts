import { useEffect, useRef, useState } from "react";
import { authError } from "../utils/authValidation";

export function useAuthSubmission() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function submit(action: () => Promise<void>, fallback: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError("");
    try { await action(); }
    catch (error) { setError(authError(error, fallback)); }
    finally { pending.current = false; setBusy(false); }
  }
  return { busy, error, setError, errorRef, submit };
}
