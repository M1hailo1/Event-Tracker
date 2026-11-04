export const SESSION_ENDED = "eventtracker-session-ended";

export function tokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" && Number.isFinite(decoded.exp) ? decoded.exp * 1000 : null;
  } catch { return null; }
}

export function endSession(expectedToken: string, notify = true) {
  if (localStorage.getItem("token") !== expectedToken) return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.dispatchEvent(new CustomEvent(SESSION_ENDED, { detail: { notify } }));
}
