import { test, expect, event, eventPage, deferred } from "./fixtures";

test("slow first load gives honest waiting feedback without showing an empty result", async ({ page, api }) => {
  const response = deferred(), requested = deferred();
  api.handlers["/events"] = async route => { requested.resolve(); await response.promise; await route.fulfill({ json: eventPage() }); };
  await page.clock.install();
  await page.goto("/");
  try {
    await requested.promise;
    await page.clock.fastForward(5000);
    await expect(page.getByText(/Still loading. This demo uses free hosting/)).toBeVisible();
    await expect(page.getByText("There are no events currently.")).toHaveCount(0);
  } finally { response.resolve(); }
  await expect(page.getByRole("heading", { name: event.name })).toBeVisible();
  await expect(page.getByText(/Still loading. This demo/)).toHaveCount(0);
});

test("failed refresh keeps the last results and retries with the selected filters", async ({ page, api }) => {
  let failures = 1;
  api.handlers["/events"] = async route => {
    const query = new URL(route.request().url()).searchParams;
    if (query.get("search") === "filtered" && failures-- > 0) await route.fulfill({ status: 503, json: { error: "Unavailable" } });
    else await route.fulfill({ json: eventPage(query.get("search") ? [{ ...event, name: "Filtered fixture result" }] : [event]) });
  };
  await page.goto("/");
  await expect(page.getByRole("heading", { name: event.name })).toBeVisible();
  await page.getByPlaceholder("Search by name...").fill("filtered");
  await expect(page.getByRole("alert")).toContainText("Showing the last loaded results.");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Filtered fixture result" })).toBeVisible();
  expect(api.calls.filter(call => call.path === "/events").at(-1)?.query.search).toBe("filtered");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("category failure leaves events usable and has a separate retry", async ({ page, api }) => {
  let attempts = 0;
  api.handlers["/categories"] = async route => {
    attempts++;
    await route.fulfill(attempts === 1 ? { status: 503, json: { error: "Unavailable" } } : { json: [{ id: "music", name: "Music", isCustom: false }] });
  };
  await page.goto("/");
  await expect(page.getByRole("heading", { name: event.name })).toBeVisible();
  await page.getByRole("button", { name: "Retry categories" }).click();
  await expect(page.getByText(/Categories are temporarily unavailable/)).toHaveCount(0);
  expect(attempts).toBe(2);
});

test("an interrupted request shows a retry instead of remaining stuck loading", async ({ page, api }) => {
  let attempts = 0;
  api.handlers["/events"] = async route => {
    attempts++;
    if (attempts === 1) await route.abort("timedout");
    else await route.fulfill({ json: eventPage() });
  };
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Unable to load events.");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: event.name })).toBeVisible();
});

test("deferred map and event-detail modules load through normal navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: event.name })).toBeVisible();
  await page.getByRole("button", { name: "Map view", exact: true }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await page.getByRole("link", { name: new RegExp(event.name) }).click();
  await expect(page.getByRole("heading", { name: event.name })).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
});
