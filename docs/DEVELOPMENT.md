# Development and deployment

## Local setup

Use Node.js 24, npm and PostgreSQL. Create a local application database and a PostgreSQL role that can access it. The test runner also needs permission to create/drop its temporary databases.

Copy [server/.env.example](../server/.env.example) to `server/.env` and [client/.env.example](../client/.env.example) to `client/.env`. Fill in the local database credentials and generate a JWT secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The Google client ID must match between client and server for Google sign-in. Placeholder IDs let the local application start for email/password development; Google authentication needs a real configured OAuth client.

```bash
cd server
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

In another terminal:

```bash
cd client
npm ci
npm run dev
```

The API defaults to `http://localhost:3000`, and Vite uses `http://localhost:5173`. PowerShell supports `cp` as an alias for `Copy-Item`; `npm.cmd` can be used if local execution policy blocks `npm.ps1`.

Migrations seed the curated categories automatically. Event illustrations are bundled in `client/public/event-covers`. Creating an initial admin requires registering a normal local account and changing its database role using a database administration tool. There is no shared production admin account for the demo.

## Tests

From `server/`:

```bash
npm test
npm run test:safety
npm run test:reliability
npm test -- --runTestsByPath tests/authValidation.integration.test.ts
```

`npm test` uses [run-tests.cjs](../server/scripts/run-tests.cjs) to create a uniquely named local database, apply all migrations, run Jest and drop the database afterward. It reads an optional `.env.test` and then `.env` as a fallback without overriding an explicitly supplied environment. Only the child processes use the temporary `DATABASE_URL`; saved environment files and application records stay untouched.

Hosted database targets are refused. The Jest setup guard also blocks direct Jest invocations against an application database. Use `npm test -- <Jest arguments>` for filtered runs. The safety tests require no database and verify both URL validation and refusal before DB-writing suites are imported.

From `client/`:

```bash
npm run lint -- --max-warnings=0
npm run build
npm run test:share
npm run typecheck:tests
npx playwright install chromium
npm run test:browser
```

Playwright starts its own Vite server on port 4173 and uses isolated fictional API responses. It blocks external requests, including Google services. It tests desktop/mobile form labels, keyboard focus, validation, pending/retry behavior, session expiration, stale 401 responses, temporary failures and discovery feedback. It does not submit to the live API or use application data.

An existing Chrome installation can be selected instead of downloading Chromium. In PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:browser
Remove-Item Env:PLAYWRIGHT_CHANNEL
```

Failure screenshots, traces and the HTML report go to ignored `client/test-results` and `client/playwright-report` folders. `npx playwright show-report` opens the report when you want to inspect it.

CI uses a temporary PostgreSQL service and an installed Chromium browser. It runs no deployment or hosted migration commands. The workflow takes effect when it is pushed to GitHub; local verification alone does not establish a successful hosted CI run.

## Lint dependency overrides

The client pins `minimatch` 11.0.1 specifically for `eslint`, `@eslint/config-array` and `@typescript-eslint/typescript-estree`. Their current upstream dependency ranges still select the affected 10.x release. The scoped overrides use the patched matcher while retaining the current lint-tool versions and rules.

Lint discovery was checked against every source/browser-test file, alongside the existing `dist` and `node_modules` exclusions. CI runs `npm audit --audit-level=moderate` to detect dependency regressions. Remove the overrides when the upstream tools adopt a patched supported version, then rerun audit, lint and tests.

## Authentication behavior

New passwords require at least 8 Unicode code points and at most 72 UTF-8 bytes. Login keeps support for existing shorter passwords while rejecting inputs over the same byte limit. Passwords are not trimmed or silently truncated. Non-ASCII characters can use multiple bytes.

The API verifies JWTs and checks current account/ban state. Invalid or expired tokens and deleted accounts return 401. Temporary account-verification database failures return 503, and banned accounts return 403.

The client clears the matching session on protected-request 401 responses and at token expiry. A response from an older token cannot clear a newer login. Network failures and 5xx responses preserve the cached session for retry. Authentication endpoint failures do not invalidate an otherwise current session.

Tokens remain in browser local storage, with a seven-day lifetime. Logout clears browser state and synchronizes sign-out between tabs; it does not revoke an already issued token on the server. Email verification, password recovery, refresh tokens and session revocation remain outside the current implementation.

## Deployment

| Component | Target | Configuration |
| --- | --- | --- |
| Client | Vercel, root `client/` | `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID` |
| API | Render or another Node host, root `server/` | `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `PORT` |
| Database | Neon | Apply committed migrations explicitly before deploying code that needs them |

Generate the Prisma client during the server build, then compile TypeScript and start the compiled API:

```bash
npx prisma generate
npm run build
npm start
```

Allowed frontend origins are configured in [app.ts](../server/src/app.ts). Google OAuth configuration must include the deployed frontend origin. Never put a database URL or JWT secret in a `VITE_` variable: client build variables are public.

`client/vercel.json` routes supported social-preview bots to the preview function before the React fallback. The function reads the public API origin from `VITE_API_URL` at runtime and fetches anonymous public-only metadata. Verify a public event and a generic private/missing-event fallback after deploying both applications.

Keep local `DATABASE_URL` and optional hosted `NEON_ONLINEDATA_URL` separate. Hosted migrations are explicit operations using `prisma migrate deploy`, with a temporary child-process override rather than a saved `.env` edit. The CI workflow never applies Neon migrations. Keep hosted migrations and demo-seeding operations separate from routine tests.

The API runs reminder and rating-prompt checks at startup and every 15 minutes. Rating prompts process a bounded batch per check. Free-host sleep and backlogs can delay delivery. No external scheduler or keep-alive service is configured.

## Demo data

The hosted fictional batch contains 36 non-recurring public events under three Demo Organizer accounts. Titles start `[DEMO]`, descriptions say `NOT A REAL EVENT`, and venue/map locations are illustrative. Only each organizer's normal seat was created; attendee registrations, ratings, comments and follows were not seeded.

The batch manifest is [demo-events-2026-11-03.json](../assets/demo-events/demo-events-2026-11-03.json). The utility is explicit and idempotent:

```bash
node server/scripts/seed-demo-events.cjs --dry-run
```

The separate `--apply-neon` option writes to Neon and is reserved for explicitly authorized dataset changes. Neither the application nor CI runs it automatically. Rerunning the existing batch skips records and does not advance their dates.

## Repeat performance measurements

From `client/`, run:

```bash
npm run measure:demo
```

The script issues three rounds of ordinary anonymous HTTP requests to the frontend, categories and paginated events. It records header/download timings, response sizes, status and frontend cache information. It does not store event bodies or schedule future requests.

The first observed request is not a controlled cold-start experiment. Compare subsequent warm requests, and distinguish network/server response time from browser rendering. The [recorded sample](../assets/performance/demo-2026-11-04.json) and [local bundle-size comparison](../assets/performance/client-bundle-2026-11-04.json) document their methodologies and limits.
