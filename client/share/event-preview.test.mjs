import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { buildPreview, createPreviewHandler } from "./event-preview.mjs";

const id = "00000000-0000-4000-8000-000000000001";
const event = {
  visibility: "PUBLIC", name: 'Demo "Music" & Friends', description: 'Fictional event description',
  organizer: "Demo Organizer", date: "2030-06-01T18:00:00Z", coverId: "music-live",
};
function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; } };
}

test("public events have absolute cover URLs, dates and Open Graph/Twitter metadata", () => {
  const html = buildPreview(event, id);
  assert.match(html, /og:title/);
  assert.match(html, /Demo &quot;Music&quot; &amp; Friends/);
  assert.match(html, /event-covers\/music-live\.webp/);
  assert.match(html, /1 Jun 2030, 18:00 UTC/);
  assert.match(html, /By Demo Organizer/);
  assert.match(html, /summary_large_image/);
  assert.match(html, new RegExp(`/events/${id}`));
});

test("private responses never expose event fields, even when a caller supplies them", () => {
  for (const visibility of ["INVITE_ONLY", "FOLLOWERS_ONLY", undefined]) {
    const html = buildPreview({ ...event, visibility, name: "Secret event", description: "Secret address" }, id);
    assert.doesNotMatch(html, /Secret|music-live/);
    assert.match(html, /share\/eventtracker\.png/);
    assert.match(html, /noindex, nofollow/);
  }
});

test("text is escaped and malformed image IDs cannot inject markup or external URLs", () => {
  const html = buildPreview({ ...event, name: '</title><script>alert(1)</script>', description: '"><img src=x onerror=alert(1)>', coverId: '../../private' }, id);
  assert.doesNotMatch(html, /<script>|<img|private/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /share\/eventtracker\.png/);
});

test("missing covers use the branded fallback and cancellations are explicit", () => {
  const html = buildPreview({ ...event, coverId: null, cancelledAt: '2030-05-01' }, id);
  assert.match(html, /Cancelled:/);
  assert.match(html, /share\/eventtracker\.png/);
});

test("handler sends no viewer credentials and uses the dedicated public endpoint", async () => {
  let requested;
  const handler = createPreviewHandler({ apiUrl: 'https://api.example.test/', fetcher: async (url, options) => {
    requested = { url: String(url), options }; return { ok: true, json: async () => event };
  } });
  const res = response();
  await handler({ method: 'GET', query: { id }, headers: { authorization: 'Bearer private-token', cookie: 'private-cookie' } }, res);
  assert.equal(requested.url, `https://api.example.test/events/${id}/share`);
  assert.deepEqual(requested.options.headers, { Accept: 'application/json' });
  assert.equal(requested.options.redirect, 'error');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.equal(res.headers.Vary, 'User-Agent');
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /music-live/);
});

test("backend failure, missing config and non-public results all fall back safely", async () => {
  for (const config of [
    {},
    { apiUrl: 'https://api.example.test', fetcher: async () => { throw Error('timeout'); } },
    { apiUrl: 'https://api.example.test', fetcher: async () => ({ ok: false }) },
    { apiUrl: 'https://api.example.test', fetcher: async () => ({ ok: true, json: async () => ({ ...event, visibility: 'INVITE_ONLY' }) }) },
  ]) {
    const res = response();
    await createPreviewHandler(config)({ method: 'GET', query: { id } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body, /share\/eventtracker\.png/);
    assert.doesNotMatch(res.body, /Demo Organizer/);
  }
});

test("invalid IDs never fetch, HEAD has no body and writes are rejected", async () => {
  let fetched = false;
  const handler = createPreviewHandler({ apiUrl: 'https://api.example.test', fetcher: async () => { fetched = true; } });
  for (const value of ['../../secret', [id, id], undefined, 'new']) {
    const res = response(); await handler({ method: 'GET', query: { id: value } }, res);
    assert.doesNotMatch(res.body, /secret/);
  }
  assert.equal(fetched, false);
  const head = response(); await handler({ method: 'HEAD', query: {} }, head); assert.equal(head.body, undefined);
  const post = response(); await handler({ method: 'POST', query: { id } }, post); assert.equal(post.statusCode, 405);
});

test("routing matches preview bots before SPA fallback; fallback image is bundled", () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
  const rule = config.rewrites.find(rule => rule.destination === "/api/event-preview?id=:id");
  const bot = new RegExp(rule.has[0].value);
  assert(bot.test('Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'));
  assert(bot.test('WhatsApp/2.0'));
  assert(!bot.test('Mozilla/5.0 Chrome/130 Safari/537.36'));
  assert.equal(config.rewrites.at(-1).destination, '/index.html');
  assert(existsSync(new URL('../public/share/eventtracker.png', import.meta.url)));
  const png = readFileSync(new URL('../public/share/eventtracker.png', import.meta.url));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});
