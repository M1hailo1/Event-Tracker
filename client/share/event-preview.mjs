const DEFAULT_SITE = "https://event-tracker-liard-seven.vercel.app";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function text(value, length) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, length) : "";
}

export function buildPreview(event, id, site = DEFAULT_SITE) {
  const url = UUID.test(id ?? "") ? `${site}/events/${id}` : site;
  let title = "EventTracker";
  let description = "Discover events and connect with your community.";
  let image = `${site}/share/eventtracker.png`;
  let imageType = "image/png", width = 1200, height = 630;
  // Defense in depth: only explicitly public, well-formed responses enrich a preview.
  const isPublic = event?.visibility === "PUBLIC" && text(event.name, 120);
  if (isPublic) {
    title = `${event.cancelledAt ? "Cancelled: " : ""}${text(event.name, 120)} | EventTracker`;
    const date = new Date(event.date);
    const dateText = Number.isFinite(+date) ? new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
    }).format(date) + " UTC" : "";
    description = [dateText, text(event.organizer, 80) ? `By ${text(event.organizer, 80)}` : "", text(event.description, 180)]
      .filter(Boolean).join(" | ");
    if (/^[a-z]+(?:-[a-z]+)+$/.test(event.coverId ?? "")) {
      image = `${site}/event-covers/${event.coverId}.webp`;
      imageType = "image/webp"; width = 960; height = 480;
    }
  }
  const meta = (property, value) => `<meta property="${property}" content="${escapeHtml(value)}" />`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
${!isPublic ? '<meta name="robots" content="noindex, nofollow" />' : ""}
<link rel="canonical" href="${escapeHtml(url)}" />
${meta("og:type", "website")}
${meta("og:site_name", "EventTracker")}
${meta("og:title", title)}
${meta("og:description", description)}
${meta("og:url", url)}
${meta("og:image", image)}
${meta("og:image:type", imageType)}
${meta("og:image:width", width)}
${meta("og:image:height", height)}
${meta("og:image:alt", isPublic && imageType === "image/webp" ? `Cover for ${text(event.name, 120)}` : "EventTracker - discover, connect, take part")}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
</head><body><a href="${escapeHtml(url)}">Open in EventTracker</a></body></html>`;
}

export function createPreviewHandler({ apiUrl, fetcher = fetch, site = DEFAULT_SITE } = {}) {
  return async function handler(req, res) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("Vary", "User-Agent");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.setHeader("Allow", "GET, HEAD");
      res.statusCode = 405;
      return res.end();
    }
    const id = req.query?.id;
    let event = null;
    if (typeof id === "string" && UUID.test(id) && apiUrl) {
      try {
        const upstream = new URL(apiUrl.replace(/\/$/, "") + `/events/${id}/share`);
        if (!["http:", "https:"].includes(upstream.protocol) || upstream.username || upstream.password) throw Error("Invalid API origin");
        const response = await fetcher(upstream, {
          signal: AbortSignal.timeout(6000), redirect: "error", headers: { Accept: "application/json" },
        });
        if (response.ok) event = await response.json();
      } catch {
        // A sleeping/unavailable API must still produce a useful generic preview.
      }
    }
    res.statusCode = 200;
    res.end(req.method === "HEAD" ? undefined : buildPreview(event, typeof id === "string" ? id : null, site));
  };
}
