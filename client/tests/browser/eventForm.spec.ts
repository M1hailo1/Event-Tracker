import { test, expect, signedIn, viewer, event } from "./fixtures";

test("create and edit date controls follow the app theme", async ({ page, api }, testInfo) => {
  await signedIn(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  api.handlers[`/events/${event.id}`] = async route => route.fulfill({ json: { ...event, createdByUserId: viewer.id } });
  for (const path of ["/events/new", `/events/${event.id}/edit`]) {
    await page.goto(path);
    const dates = page.locator('input[type="datetime-local"]');
    await expect(dates).toHaveCount(2);
    for (const input of await dates.all()) await expect(input).toHaveCSS("color-scheme", "dark");
    await dates.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(path === "/events/new" ? "create-dark.png" : "edit-dark.png") });
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    for (const input of await dates.all()) await expect(input).toHaveCSS("color-scheme", "light");
  }
});
