import { test, expect, signedIn, event, viewer } from "./fixtures";

test("interests preserve choices after failure, save and refresh recommendations", async ({ page, api }) => {
  await signedIn(page);
  api.handlers["/users/me/stats"] = async route => route.fulfill({ json: { totalEvents: 0, categoryCounts: [], topCategory: null } });
  for (const kind of ["followers", "following"]) api.handlers[`/users/${viewer.id}/${kind}`] = async route => route.fulfill({ json: { items: [], total: 0, totalPages: 0, page: 1 } });
  let selected: string[] = [];
  let saves = 0;
  api.handlers["/users/me/interests"] = async route => {
    if (route.request().method() === "PUT") {
      saves++;
      if (saves === 1) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
      selected = route.request().postDataJSON().categoryIds;
    }
    return route.fulfill({ json: selected.map(id => ({ id, name: "Music" })) });
  };
  api.handlers["/users/me/dashboard"] = async route => route.fulfill({ json: {
    myUpcomingEvents: [], registeredUpcomingEvents: [], followingUpcomingEvents: [], savedUpcomingEvents: [], hasMore: {},
    recommendedEvents: selected.length ? [{ ...event, recommendationReason: "Matches your interest in Music" }] : [], exploreEvents: [],
  } });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Explore something new" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your interests" })).toHaveCount(0);
  await page.getByRole("link", { name: "Manage your interests" }).click();
  await expect(page.getByRole("region", { name: "Organized events" })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Music" }).check();
  await page.getByRole("button", { name: "Save interests" }).click();
  await expect(page.getByRole("alert")).toContainText("Couldn't save your interests");
  await expect(page.getByRole("checkbox", { name: "Music" })).toBeChecked();
  await page.getByRole("button", { name: "Save interests" }).click();
  await expect(page.getByText("Interests saved.")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: event.name })).toBeVisible();
  await expect(page.getByRole("list", { name: "Why these events were recommended" })).toHaveCount(0);
  await page.getByRole("link", { name: "Manage your interests" }).click();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Music" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Music" }).uncheck();
  await page.getByRole("button", { name: "Save interests" }).click();
  await expect(page.getByText("Interests saved.")).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: event.name })).toHaveCount(0);
  expect(selected).toEqual([]);
});
