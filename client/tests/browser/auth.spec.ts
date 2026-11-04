import { test, expect, viewer, signedIn, token, deferred, event } from "./fixtures";

test("login labels, keyboard navigation, pending state, duplicate protection and retry", async ({ page, api }) => {
  const response = deferred();
  let attempts = 0;
  api.handlers["/auth/login"] = async route => {
    attempts++;
    if (attempts === 1) { await response.promise; await route.fulfill({ status: 401, json: { error: "Wrong email/password" } }); }
    else await route.fulfill({ json: { user: viewer, token: api.nextToken } });
  };
  await page.goto("/login");
  const email = page.getByLabel("Email", { exact: true }), password = page.getByLabel("Password", { exact: true });
  await expect(email).toHaveAttribute("autocomplete", "username");
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  await email.fill(viewer.email); await password.fill("valid-password-123");
  await email.focus(); await page.keyboard.press("Tab"); await expect(password).toBeFocused();
  try {
    await page.getByRole("form", { name: "Log in" }).evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
    await expect(page.getByRole("button", { name: "Signing in..." })).toBeDisabled();
    await expect(email).toBeDisabled();
    await expect.poll(() => attempts).toBe(1);
  } finally { response.resolve(); }
  await expect(page.getByRole("alert")).toHaveText("Wrong email/password");
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(email).toHaveValue(viewer.email);
  await expect(password).toHaveValue("valid-password-123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
  expect(attempts).toBe(2);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("token"))).toBe(api.nextToken);
});

test("registration labels, autocomplete and Unicode validation prevent invalid requests", async ({ page, api }) => {
  await page.goto("/register");
  await expect(page.getByText("Use at least 8 characters", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveAttribute("autocomplete", "name");
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("autocomplete", "username");
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "new-password");
  await expect(page.getByLabel("Confirm password")).toHaveAttribute("autocomplete", "new-password");
  await page.getByLabel("Name", { exact: true }).fill("Fictional Candidate");
  await page.getByLabel("Email", { exact: true }).fill(viewer.email);
  for (const [password, confirmation, message] of [
    ["😀".repeat(19), "😀".repeat(19), /too long/],
    ["😀".repeat(6), "😀".repeat(6), /at least 8 characters/],
    ["valid-password-123", "different-password", /don't match/],
  ] as const) {
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(confirmation);
    await page.getByRole("button", { name: "Register", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText(message);
    await expect(page.getByRole("alert")).toBeFocused();
  }
  expect(api.calls.filter(call => call.path === "/auth/register")).toHaveLength(0);
});

test("registration shows server validation, keeps inputs and retries successfully", async ({ page, api }) => {
  let attempts = 0;
  const response = deferred();
  api.handlers["/auth/register"] = async route => {
    attempts++;
    if (attempts === 1) { await response.promise; await route.fulfill({ status: 400, json: { error: { fieldErrors: { email: ["Please check this email address."] } } } }); }
    else await route.fulfill({ json: { user: viewer, token: api.nextToken } });
  };
  await page.goto("/register");
  await page.getByLabel("Name", { exact: true }).fill("Fictional Candidate");
  await page.getByLabel("Email", { exact: true }).fill(viewer.email);
  await page.getByLabel("Password", { exact: true }).fill("Valid123");
  await page.getByLabel("Confirm password").fill("Valid123");
  try {
    await page.getByRole("button", { name: "Register", exact: true }).click();
    await expect(page.getByRole("button", { name: "Creating account..." })).toBeDisabled();
  } finally { response.resolve(); }
  await expect(page.getByRole("alert")).toHaveText("Please check this email address.");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Fictional Candidate");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
});

test("a genuine profile 401 clears the stored session and private UI", async ({ page, api }) => {
  await signedIn(page);
  api.handlers["/users/me"] = route => route.fulfill({ status: 401, json: { error: "Invalid or expired token" } });
  await page.goto("/dashboard");
  await expect(page.getByText("Your session has ended. Please sign in again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out", includeHidden: true })).toHaveCount(0);
  expect(await page.evaluate(() => [localStorage.getItem("token"), localStorage.getItem("user")])).toEqual([null, null]);
});

for (const failure of ["network", "503"] as const) {
  test(`a temporary ${failure} failure preserves the existing session`, async ({ page, api }) => {
    const stored = await signedIn(page);
    api.handlers["/users/me"] = route => failure === "network" ? route.abort("internetdisconnected") : route.fulfill({ status: 503, json: { error: "Temporarily unavailable" } });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out", includeHidden: true })).toHaveCount(1);
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBe(stored);
    await expect(page.getByText(/Your session has ended/)).toHaveCount(0);
  });
}

test("idle token expiry clears the session without requiring another API request", async ({ page }) => {
  const now = new Date("2030-01-01T12:00:00Z");
  await page.clock.install({ time: now });
  await signedIn(page, token(now.getTime() + 3000));
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.clock.fastForward(3100);
  await expect(page.getByText("Your session has ended. Please sign in again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out", includeHidden: true })).toHaveCount(0);
});

test("an already expired cached token is not restored on page load", async ({ page }) => {
  await signedIn(page, token(Date.now() - 60000));
  await page.goto("/saved");
  await expect(page.getByText("to save events and view your list.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out", includeHidden: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
});

for (const state of ["token-only", "user-only", "malformed-user"] as const) {
  test(`an incomplete ${state} cache does not restore a signed-in UI`, async ({ page }) => {
    await page.addInitScript(({ state, value, viewer }) => {
      if (state !== "user-only") localStorage.setItem("token", value);
      if (state !== "token-only") localStorage.setItem("user", state === "malformed-user" ? "null" : JSON.stringify(viewer));
    }, { state, value: token(), viewer });
    await page.goto("/saved");
    await expect(page.getByText("to save events and view your list.")).toBeVisible();
    expect(await page.evaluate(() => [localStorage.getItem("token"), localStorage.getItem("user")])).toEqual([null, null]);
  });
}

test("a delayed 401 from an old token cannot clear a newer login", async ({ page, api }) => {
  const old = await signedIn(page, token(Date.now() + 86400000, "old"));
  const response = deferred(), requested = deferred();
  api.nextToken = token(Date.now() + 86400000, "new");
  api.handlers["/users/me"] = async route => { requested.resolve(); await response.promise; await route.fulfill({ status: 401, json: { error: "Old session" } }); };
  await page.goto("/login"); await requested.promise;
  try {
    await page.getByLabel("Email", { exact: true }).fill(viewer.email);
    await page.getByLabel("Password", { exact: true }).fill("valid-password-123");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Events", exact: true })).toBeVisible();
    const received = page.waitForResponse(result => result.url().endsWith("/users/me") && result.status() === 401);
    response.resolve(); await received;
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    expect(old).not.toBe(api.nextToken);
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBe(api.nextToken);
    await expect(page.getByRole("button", { name: "Sign out", includeHidden: true })).toHaveCount(1);
    await expect(page.getByText(/Your session has ended/)).toHaveCount(0);
  } finally { response.resolve(); }
});

test("a failed login request does not invalidate a separate current session", async ({ page, api }) => {
  const stored = await signedIn(page);
  api.handlers["/auth/login"] = route => route.fulfill({ status: 401, json: { error: "Wrong email/password" } });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(viewer.email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Wrong email/password");
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBe(stored);
});

test("a protected action 401 ends the session outside the profile refresh flow", async ({ page, api }) => {
  await signedIn(page);
  api.handlers[`/events/${event.id}/save`] = route => route.fulfill({ status: 401, json: { error: "Session expired" } });
  await page.goto("/");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(page.getByText("Your session has ended. Please sign in again.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
});

test("signing out in another tab clears the current private UI", async ({ page }) => {
  await signedIn(page);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.evaluate(() => {
    localStorage.removeItem("token"); localStorage.removeItem("user");
    window.dispatchEvent(new StorageEvent("storage", { key: "token", newValue: null, storageArea: localStorage }));
  });
  await expect(page.getByRole("button", { name: "Sign out", includeHidden: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
});
