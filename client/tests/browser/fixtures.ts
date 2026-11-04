import { test as base, expect, type Page, type Route } from "@playwright/test";

export const viewer = { id: "00000000-0000-4000-8000-000000000001", name: "Fictional Viewer", email: "viewer@example.test", role: "USER", createdAt: "2026-01-01" };
export const event = {
  id: "00000000-0000-4000-8000-000000000002", name: "Fictional music meetup", description: "NOT A REAL EVENT",
  date: "2099-06-01T12:00:00Z", endDate: null, cancelledAt: null, location: "Demo Park", latitude: 44.8, longitude: 20.4,
  categoryId: "music", category: { id: "music", name: "Music" }, categories: [{ id: "music", name: "Music" }],
  createdByUserId: "organizer", createdBy: { id: "organizer", name: "Demo Organizer" }, visibility: "PUBLIC",
  maxCapacity: 20, coverId: null, isRecurring: false, _count: { registrations: 1 }, rating: { average: null, count: 0 },
};
export const eventPage = (items = [event]) => ({ items, page: 1, pageSize: 12, total: items.length, totalPages: items.length ? 1 : 0 });
export function token(expiresAt = Date.now() + 86400000, marker = "fixture") {
  return `${Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url")}.${Buffer.from(JSON.stringify({ userId: viewer.id, exp: Math.floor(expiresAt / 1000), jti: marker })).toString("base64url")}.fixture-signature`;
}
export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
export async function signedIn(page: Page, value = token()) {
  await page.addInitScript(({ user, value }) => {
    if (window.top !== window || sessionStorage.getItem("fixture-initialized")) return;
    sessionStorage.setItem("fixture-initialized", "true");
    localStorage.setItem("token", value); localStorage.setItem("user", JSON.stringify(user));
  }, { user: viewer, value });
  return value;
}
export interface FakeApi {
  calls: { path: string; method: string; body: Record<string, unknown> | null; query: Record<string, string> }[];
  handlers: Record<string, (route: Route) => Promise<void>>;
  nextToken: string;
}

export const test = base.extend<{ api: FakeApi }>({
  api: [async ({ page }, use) => {
    const api: FakeApi = { calls: [], handlers: {}, nextToken: token() };
    const errors: string[] = [], unmatched: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === "http://127.0.0.1:4173" && !url.pathname.startsWith("/__test_api/")) return route.continue();
      if (url.origin !== "http://127.0.0.1:4173") return route.abort();
      const path = url.pathname.replace(/^\/__test_api/, "");
      api.calls.push({ path, method: request.method(), body: request.postData() ? request.postDataJSON() : null, query: Object.fromEntries(url.searchParams) });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization,Content-Type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" } });
      if (api.handlers[path]) return api.handlers[path](route);
      let data: unknown;
      if (path === "/users/me") data = viewer;
      else if (path === "/auth/login" || path === "/auth/register") data = { user: viewer, token: api.nextToken };
      else if (path === "/events/saved-ids") data = [];
      else if (path === "/events") data = url.searchParams.has("page") ? eventPage() : [event];
      else if (path === `/events/${event.id}`) data = { ...event, registrations: [], myRating: null };
      else if (path === `/events/${event.id}/attendees`) data = eventPage([]);
      else if (path === `/events/${event.id}/comments`) data = { comments: [], nextCursor: null };
      else if (path === "/categories") data = [{ id: "music", name: "Music", isCustom: false }];
      else if (path === "/notifications/unread-count") data = { count: 0 };
      else if (path === "/users/me/dashboard") data = { myUpcomingEvents: [], registeredUpcomingEvents: [], followingUpcomingEvents: [], savedUpcomingEvents: [], hasMore: {} };
      else { unmatched.push(path); return route.fulfill({ status: 404, json: { error: "Unmatched fixture" } }); }
      return route.fulfill({ json: data });
    });
    await use(api);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    expect(unmatched).toEqual([]);
  }, { auto: true }],
});
export { expect };
