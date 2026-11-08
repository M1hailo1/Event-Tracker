import { test, expect, signedIn, viewer } from "./fixtures";

const entry = {
  id: "audit-entry", createdAt: "2026-11-08T12:00:00Z", actorId: "fictional-moderator",
  actorName: "Fictional Moderator", actorRole: "MODERATOR", action: "USER_BANNED",
  targetType: "USER", targetId: "fictional-target", targetLabel: "Fictional Member",
  details: { before: { bannedUntil: null }, after: { banReason: "Repeated spam", bannedUntil: "2026-11-09T12:00:00Z" } },
};

test("admins can inspect, filter, paginate and retry audit history", async ({ page, api }, testInfo) => {
  await signedIn(page);
  const admin = { ...viewer, role: "ADMIN" };
  await page.addInitScript(user => localStorage.setItem("user", JSON.stringify(user)), admin);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  api.handlers["/users/me"] = async route => route.fulfill({ json: admin });
  let fail = false;
  api.handlers["/admin/audit-history"] = async route => {
    if (fail) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    const params = new URL(route.request().url()).searchParams;
    const pageNumber = Number(params.get("page") ?? 1);
    return route.fulfill({ json: {
      items: params.get("actor") === "Nobody" ? [] : [{ ...entry, id: `entry-${pageNumber}`, targetLabel: pageNumber === 2 ? "Fictional Second Member" : entry.targetLabel }],
      page: pageNumber, pageSize: 20, total: 21, totalPages: 2,
    } });
  };
  await page.goto("/admin?tab=audit");
  await expect(page.getByRole("button", { name: "Audit history", exact: true })).toBeVisible();
  await expect(page.getByText("Fictional Moderator", { exact: false })).toBeVisible();
  await page.getByText("View details", { exact: true }).click();
  await expect(page.getByText("Repeated spam", { exact: true })).toBeVisible();
  await expect(page.getByText("fictional-moderator", { exact: true })).toBeVisible();
  const darkText = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--color-gray-100)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(page.getByRole("heading", { name: "User banned", exact: true })).toHaveCSS("color", darkText);
  await expect(page.getByRole("button", { name: "Refresh history" })).toHaveCSS("color", darkText);
  await expect(page.getByLabel("From (UTC)")).toHaveCSS("color-scheme", "dark");
  await expect(page.locator(".audit-detail-panel").first()).toHaveCSS("background-color", "rgb(17, 24, 39)");
  await expect(page.locator(".audit-detail-panel").first()).toHaveCSS("color", "rgb(243, 244, 246)");
  await expect(page.getByText("2026-11-09T12:00:00Z", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("audit-dark.png"), fullPage: true });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  const lightText = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--color-gray-900)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(page.getByRole("heading", { name: "User banned", exact: true })).toHaveCSS("color", lightText);
  await expect(page.getByLabel("From (UTC)")).toHaveCSS("color-scheme", "light");
  await expect(page.locator(".audit-detail-panel").first()).toHaveCSS("background-color", "rgb(249, 250, 251)");
  await expect(page.locator(".audit-detail-panel").first()).toHaveCSS("color", "rgb(17, 24, 39)");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Fictional Second Member", { exact: true })).toBeVisible();
  await page.getByLabel("Action", { exact: true }).selectOption("USER_BANNED");
  await page.getByLabel("Staff name or ID").fill("Nobody");
  await expect(page.getByText("No recorded actions match these filters.")).toBeVisible();
  const call = api.calls.filter(call => call.path === "/admin/audit-history").at(-1)!;
  expect(call.query).toMatchObject({ action: "USER_BANNED", actor: "Nobody", page: "1", pageSize: "20" });
  fail = true;
  await page.getByRole("button", { name: "Refresh history" }).click();
  await expect(page.getByRole("alert")).toContainText("Could not load audit history");
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("No recorded actions match these filters.")).toBeVisible();
});

test("moderators cannot open the audit tab or request its data", async ({ page, api }) => {
  await signedIn(page);
  const moderator = { ...viewer, role: "MODERATOR" };
  await page.addInitScript(user => localStorage.setItem("user", JSON.stringify(user)), moderator);
  api.handlers["/users/me"] = async route => route.fulfill({ json: moderator });
  api.handlers["/admin/stats"] = async route => route.fulfill({ json: {
    userCount: 3, eventCount: 1, upcomingEventCount: 1, registrationCount: 1, categoryCount: 18, adminCount: 1, moderatorCount: 1,
  } });
  await page.goto("/admin?tab=audit");
  await expect(page.getByText("Total users", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Audit history", exact: true })).toHaveCount(0);
  expect(api.calls.some(call => call.path === "/admin/audit-history")).toBe(false);
});
