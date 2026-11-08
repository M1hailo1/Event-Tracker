import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const site = "https://event-tracker-liard-seven.vercel.app";
const description = "Discover community events, find your interests and connect with people through EventTracker.";
const titles: Record<string, string> = {
  "/": "Discover events", "/dashboard": "Dashboard", "/saved": "Saved events",
  "/profile": "Your profile", "/login": "Sign in", "/register": "Create an account",
  "/events/new": "Create an event", "/admin": "Administration",
};

function meta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, key); document.head.append(element); }
  element.content = content;
}

function updateMetadata(title: string, summary: string, canonical: string, indexable: boolean, image = `${site}/share/eventtracker.png`) {
  document.title = `${title} | EventTracker`;
  meta("name", "description", summary);
  meta("name", "robots", indexable ? "index, follow" : "noindex, follow");
  meta("property", "og:title", document.title);
  meta("property", "og:description", summary);
  meta("property", "og:url", canonical);
  meta("property", "og:image", image);
  const cover = image.endsWith(".webp");
  meta("property", "og:image:type", cover ? "image/webp" : "image/png");
  meta("property", "og:image:width", cover ? "960" : "1200");
  meta("property", "og:image:height", cover ? "480" : "630");
  meta("property", "og:image:alt", cover ? `Cover for ${title}` : "EventTracker - discover, connect, take part");
  meta("name", "twitter:title", document.title);
  meta("name", "twitter:description", summary);
  meta("name", "twitter:image", image);
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.append(link); }
  link.href = canonical;
}

export default function PageMetadata() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const canonical = `${site}${pathname}`;
    const match = pathname.match(/^\/events\/([0-9a-f-]{36})$/i);
    const reset = (indexable: boolean) => updateMetadata(titles[pathname] ?? (match ? "Event" : pathname.startsWith("/users/") ? "Organizer profile" : "EventTracker"), description, canonical, indexable);
    reset((pathname === "/" && !search) || !!match);
    if (!match) return;
    const controller = new AbortController();
    const timer = setTimeout(() => { reset(false); controller.abort(); }, 65000);
    fetch(`${import.meta.env.VITE_API_URL?.replace(/\/$/, "")}/events/${match[1]}/share`, { credentials: "omit", signal: controller.signal })
      .then(async response => {
        if (!response.ok) { if (!controller.signal.aborted) reset(false); return; }
        const event = await response.json();
        if (controller.signal.aborted) return;
        if (event.visibility !== "PUBLIC" || typeof event.name !== "string") { reset(false); return; }
        const name = event.name.replace(/\s+/g, " ").trim().slice(0, 120);
        const summary = typeof event.description === "string" ? event.description.replace(/\s+/g, " ").trim().slice(0, 160) : "";
        const demo = name.toUpperCase().startsWith("[DEMO]") || /NOT A REAL EVENT|DEMONSTRATION ONLY/i.test(event.description ?? "");
        const image = /^[a-z]+(?:-[a-z]+)+$/.test(event.coverId ?? "") ? `${site}/event-covers/${event.coverId}.webp` : undefined;
        updateMetadata(name, summary || "View this community event on EventTracker.", canonical, !demo && !event.cancelledAt, image);
      }).catch(() => { if (!controller.signal.aborted) reset(false); }).finally(() => clearTimeout(timer));
    return () => { controller.abort(); clearTimeout(timer); };
  }, [pathname, search]);
  return null;
}
