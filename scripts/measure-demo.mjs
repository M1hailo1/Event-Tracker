import { performance } from "node:perf_hooks";

const frontend = new URL(process.argv[2] || "https://event-tracker-liard-seven.vercel.app");
const api = new URL(process.argv[3] || "https://event-tracker-tio1.onrender.com");
for (const target of [frontend, api]) {
  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) throw Error("Use public HTTP origins without credentials.");
}
const targets = [
  ["frontend", new URL("/", frontend.origin)],
  ["categories", new URL("/categories", api.origin)],
  ["eventPage", new URL("/events?page=1&pageSize=12", api.origin)],
];
const report = {
  measuredAt: new Date().toISOString(),
  methodology: "Three sequential rounds; requests within each round run concurrently. First observed request is not a proven cold start. Timings measure HTTP headers and complete response download, not browser rendering. No authentication or keep-alive scheduling.",
  frontend: frontend.origin, api: api.origin, rounds: [],
};
async function measure([name, url]) {
  const started = performance.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(70000) });
    const headersMs = Math.round(performance.now() - started);
    const body = await response.arrayBuffer();
    return { name, status: response.status, headersMs, totalMs: Math.round(performance.now() - started), bytes: body.byteLength, cache: response.headers.get("x-vercel-cache") };
  } catch (error) { return { name, error: error.name, totalMs: Math.round(performance.now() - started) }; }
}
for (let round = 1; round <= 3; round++) {
  report.rounds.push({ round, results: await Promise.all(targets.map(measure)) });
}
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
if (report.rounds.some(round => round.results.some(result => result.error || result.status !== 200))) process.exitCode = 1;
