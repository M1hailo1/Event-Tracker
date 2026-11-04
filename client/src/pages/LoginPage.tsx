import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/useTheme";
import { useAuthSubmission } from "../components/useAuthSubmission";
import { passwordError } from "../utils/authValidation";

const inputClass = "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-60";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { busy, error, setError, errorRef, submit } = useAuthSubmission();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const validation = passwordError(password, false);
    if (validation) { setError(validation); return; }
    await submit(async () => { await login(email.trim(), password); navigate("/"); }, "Unable to sign in. Please try again.");
  }

  async function handleGoogleSuccess({ credential }: { credential?: string }) {
    if (!credential || busy) return;
    await submit(async () => { await loginWithGoogle(credential); navigate("/"); }, "Google sign in failed. Please try again.");
  }

  return <div className="max-w-sm mx-auto mt-8">
    <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">Log in</h1>
    <form aria-label="Log in" aria-busy={busy} aria-describedby={error ? "auth-error" : undefined} onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <div>
          <label htmlFor="login-email" className={labelClass}>Email</label>
          <input id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={event => setEmail(event.target.value)} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="login-password" className={labelClass}>Password</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required   className={inputClass} />
        </div>
        {error && <p ref={errorRef} id="auth-error" role="alert" tabIndex={-1} className="rounded text-sm text-red-600 focus:outline-none dark:text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{busy ? "Signing in..." : "Log in"}</button>
      </fieldset>
      {busy && <p role="status" className="mt-3 text-sm text-gray-500 dark:text-gray-400">Signing in...</p>}
    </form>
    <div inert={busy} aria-busy={busy} className="mt-4 flex justify-center border-t border-gray-100 pt-4 dark:border-gray-800">
      <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google sign in failed. Please try again.")} theme={theme === "dark" ? "filled_black" : "outline"} />
    </div>
    <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">Don't have an account? <Link to="/register" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Register</Link></p>
  </div>;
}
