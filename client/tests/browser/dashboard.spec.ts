import { test, expect, signedIn, event } from "./fixtures";

test("dashboard tabs show one section and support keyboard navigation", async ({ page, api }) => {
  await signedIn(page);
  api.handlers["/users/me/dashboard"] = async route => route.fulfill({ json: {
    recommendedEvents: [event], exploreEvents: [{ ...event, id: "explore", name: "Explore fixture" }],
    savedUpcomingEvents: [event], registeredUpcomingEvents: [], myUpcomingEvents: [], followingUpcomingEvents: [],
    hasMore: { savedUpcomingEvents: true },
  } });
  await page.goto("/dashboard");
  await expect(page.getByRole("tab", { name: "Recommendations", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Explore something new" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Explore", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Explore something new" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explore fixture" })).toBeVisible();
  await page.getByRole("tab", { name: "Saved", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Saved events", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommended for you" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View all", exact: true })).toHaveAttribute("href", "/saved");
  await page.getByRole("tab", { name: "Saved", exact: true }).press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Attending", exact: true })).toBeFocused();
  await expect(page.getByText("You're not registered for any upcoming or ongoing events.")).toBeVisible();
  await page.getByRole("tab", { name: "Attending", exact: true }).press("End");
  await expect(page.getByRole("tab", { name: "Following", exact: true })).toBeFocused();
  await page.getByRole("tab", { name: "Following", exact: true }).press("Home");
  await expect(page.getByRole("heading", { name: "Recommended for you" })).toBeVisible();
  await page.getByRole("tab", { name: "Your events", exact: true }).click();
  await expect(page.getByRole("link", { name: "Create an event", exact: true })).toBeVisible();
});

test("exploration tab stays available without recommendations or exploration results", async ({ page }) => {
  await signedIn(page);
  await page.goto("/dashboard");
  await page.getByRole("tab", { name: "Explore", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Explore something new" })).toBeVisible();
  await expect(page.getByText("No different categories to explore right now. Browse all events for more options.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore events", exact: true })).toHaveAttribute("href", "/");
});
