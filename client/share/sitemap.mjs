const site = "https://event-tracker-liard-seven.vercel.app";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createSitemapHandler({ apiUrl, fetcher = fetch } = {}) {
  return async function handler(req, res) {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!["GET", "HEAD"].includes(req.method)) {
      res.setHeader("Allow", "GET, HEAD"); res.statusCode = 405; return res.end();
    }
    try {
      const upstream = new URL(`${apiUrl?.replace(/\/$/, "")}/seo/events`);
      if (!["https:", "http:"].includes(upstream.protocol) || upstream.username || upstream.password) throw Error("Invalid API origin");
      const response = await fetcher(upstream, { signal: AbortSignal.timeout(8000), redirect: "error", headers: { Accept: "application/json" } });
      if (!response.ok) throw Error("Sitemap unavailable");
      const events = await response.json();
      if (!Array.isArray(events) || events.some(event => !uuid.test(event?.id))) throw Error("Invalid sitemap data");
      const urls = [site + "/", ...[...new Set(events.slice(0, 49999).map(event => event.id))].map(id => `${site}/events/${id}`)];
      res.statusCode = 200;
      res.end(req.method === "HEAD" ? undefined : `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${url}</loc></url>`).join("")}</urlset>`);
    } catch {
      res.statusCode = 503;
      res.setHeader("Retry-After", "60");
      res.end(req.method === "HEAD" ? undefined : '<?xml version="1.0" encoding="UTF-8"?><error>Sitemap temporarily unavailable</error>');
    }
  };
}
