import test from "node:test";
import assert from "node:assert/strict";
import { createSitemapHandler } from "./sitemap.mjs";
import { buildPreview } from "./event-preview.mjs";
import { readFileSync } from "node:fs";

const id = "00000000-0000-4000-8000-000000000002";
const response = () => ({ headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; } });

test("sitemap includes canonical homepage and unique public endpoint IDs without viewer credentials", async () => {
  const handler = createSitemapHandler({ apiUrl: "https://api.example.test", fetcher: async (url, options) => {
    assert.equal(String(url), "https://api.example.test/seo/events");
    assert.deepEqual(options.headers, { Accept: "application/json" });
    return { ok: true, json: async () => [{ id }, { id }] };
  } });
  const res = response();
  await handler({ method: "GET", headers: { authorization: "secret" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal((res.body.match(/<url>/g) ?? []).length, 2);
  assert.match(res.body, new RegExp(`/events/${id}`));
  assert.doesNotMatch(res.body, /secret|undefined/);
  assert.equal(res.headers["Cache-Control"], "no-store");
  const head = response();
  await handler({ method: "HEAD" }, head);
  assert.equal(head.body, undefined);
});

test("sitemap failures and malformed IDs return retryable failures, not a misleading empty sitemap", async () => {
  for (const result of [{ ok: false }, { ok: true, json: async () => [{ id: '<script>' }] }]) {
    const res = response();
    await createSitemapHandler({ apiUrl: "https://api.example.test", fetcher: async () => result })({ method: "GET" }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.headers["Retry-After"], "60");
    assert.doesNotMatch(res.body, /script|urlset/);
  }
});

test("demo previews stay shareable but cannot request search indexing", () => {
  const html = buildPreview({ visibility: "PUBLIC", name: "[DEMO] Fictional event", description: "NOT A REAL EVENT", date: "2099-01-01" }, id);
  assert.match(html, /\[DEMO\] Fictional event/);
  assert.match(html, /noindex, nofollow/);
});

test("hosting routes expose sitemap and robots before the SPA catch-all and account pages have noindex headers", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url)));
  assert.ok(config.rewrites.findIndex(route => route.source === "/sitemap.xml") < config.rewrites.findIndex(route => route.source === "/(.*)"));
  assert.ok(config.rewrites.some(route => route.source === "/robots.txt"));
  assert.ok(config.headers.some(route => route.source.includes("dashboard") && route.headers.some(header => header.key === "X-Robots-Tag")));
  assert.match(readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8"), /Sitemap: https:\/\/event-tracker-liard-seven.vercel.app\/sitemap.xml/);
});
