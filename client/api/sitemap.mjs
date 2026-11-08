import { createSitemapHandler } from "../share/sitemap.mjs";

export default createSitemapHandler({ apiUrl: process.env.VITE_API_URL });
