import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { GoogleLogin } from "@react-oauth/google";

const inputClass =
  "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
const labelClass =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError("Wrong email or password");
      console.error(err);
    }
  }

  async function handleGoogleSuccess(credentialResponse: {
    credential?: string;
  }) {
    if (!credentialResponse.credential) return;
    setError("");
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate("/");
    } catch (err) {
      setError("Google sign in failed");
      console.error(err);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
        Log in
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4"
      >
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-indigo-700"
        >
          Log in
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError("Google sign in failed")}
          theme={theme === "dark" ? "filled_black" : "outline"}
          width="100%"
        />
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
