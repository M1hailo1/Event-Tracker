import { test, expect, event, signedIn } from "./fixtures";

test("route navigation updates titles, canonical URLs and account indexing rules", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Discover events | EventTracker");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://event-tracker-liard-seven.vercel.app/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await page.goto("/login");
  await expect(page).toHaveTitle("Sign in | EventTracker");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  await page.goto("/?scope=registered");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://event-tracker-liard-seven.vercel.app/");
});

test("public event metadata is anonymous and demo metadata remains noindex", async ({ page, api }) => {
  await signedIn(page);
  api.handlers[`/events/${event.id}/share`] = async route => {
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ json: { ...event, description: "A fictional browser fixture for metadata testing" } });
  };
  await page.goto(`/events/${event.id}`);
  await expect(page).toHaveTitle(`${event.name} | EventTracker`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "A fictional browser fixture for metadata testing");
  api.handlers[`/events/${event.id}/share`] = async route => route.fulfill({ json: { ...event, name: "[DEMO] Fictional event" } });
  await page.reload();
  await expect(page).toHaveTitle("[DEMO] Fictional event | EventTracker");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
});

test("private event metadata stays generic even when the signed-in viewer can read the event", async ({ page, api }) => {
  await signedIn(page);
  api.handlers[`/events/${event.id}`] = async route => route.fulfill({ json: { ...event, name: "Private fixture title", visibility: "INVITE_ONLY", registrations: [] } });
  api.handlers[`/events/${event.id}/share`] = async route => route.fulfill({ status: 404, json: { error: "Preview unavailable" } });
  await page.goto(`/events/${event.id}`);
  await expect(page.getByRole("heading", { name: "Private fixture title" })).toBeVisible();
  await expect(page).toHaveTitle("Event | EventTracker");
  await expect(page.locator('meta[property="og:title"]')).not.toHaveAttribute("content", /Private fixture/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
});
