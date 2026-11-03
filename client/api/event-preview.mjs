import { createPreviewHandler } from "../share/event-preview.mjs";

// Same public API URL already configured for the Vite client in Vercel settings.
export default createPreviewHandler({ apiUrl: process.env.VITE_API_URL });
