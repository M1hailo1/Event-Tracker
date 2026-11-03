# Event Tracker

A full-stack web application for creating, discovering and attending events. Users can publish illustrated events on an interactive map, control who can see them, follow other users, discuss events and rate events they registered for. Admins and moderators have a dedicated panel for managing users, events and comment reports.

Built as a diploma (thesis) project.

**Live demo:** https://event-tracker-liard-seven.vercel.app

## Screenshots

These screenshots show the current interface with fictional demonstration events, locations and accounts. They do not contain real user records or private addresses.

**Discover events:** illustrated covers, category icons, search filters and balanced card columns.

![Desktop event discovery with illustrated covers and category icons](assets/screenshots/events-desktop.png)

<details>
<summary>More screenshots: event details, cover selection, categories and mobile</summary>

**Event summary:** a cover, description, visibility, selected categories and attendance information.

![Event summary showing an acoustic session with its cover and category badges](assets/screenshots/event-details.png)

**Cover library:** browse the bundled illustrations by category without uploading files.

![Cover library filtered to outdoors and adventure illustrations](assets/screenshots/cover-library.png)

**Category selection:** choose up to three categories and set the main one.

![Three selected categories with main-category and remove controls](assets/screenshots/category-selection.png)

**Mobile discovery:** the same event cards and filters adapt to a narrow screen.

<img src="assets/screenshots/events-mobile.png" alt="Mobile event list with responsive navigation and illustrated cards" width="320" />

</details>

## Features

**Events**

- Create and edit events with name, description, date range, capacity and location
- Permanent cancellation is the primary removal action: retain the event page, discussion and registrations, show a cancelled status, stop registrations/invitations/reminders and notify attendees in-app. Permanent deletion remains available for accidental creation
- Cancel a single recurring occurrence or stop the whole series; stopping a series cancels upcoming/ongoing occurrences while preserving ended history
- Choose 1–3 categories from 18 curated choices, with one main category; custom category creation is disabled
- Optional covers from a bundled library of 40 compressed illustrations (about 2 MB total), with preview, replacement and removal; no uploads or external image storage needed
- Pick the event location on an interactive map (Leaflet + OpenStreetMap) with automatic reverse geocoding of the address
- Map display of events, so you can browse what is happening and where
- Recurring events (daily, weekly, monthly, yearly) - future instances are generated after the current event ends, preserving its duration, cover and categories
- Register / unregister before an event starts, with capacity limits and a public attendee list; registration stays closed while an event is ongoing
- Concurrent registrations are serialized per event so competing requests cannot claim the same final seat; the organizer's registration is created atomically with the event
- Search by name or city, filter by any selected category, and sort by date or name
- Upcoming and ongoing events remain in active discovery and dashboards until their end time; ended and cancelled events appear in history. Cancelled events are excluded from attended-event statistics and the attended-only filter
- Event edits validate the final combined start/end dates, including partial updates; an optional end time can be removed

**Dashboard and calendar**

- Events you are attending
- Events you are organizing
- Upcoming and ongoing events from people you follow that you have not registered for yet
- Event grids use numbered pages (12 events per page); search, categories, city and sort are applied on the server across all matching results
- Dashboard sections show up to six events, with View all links only when more results exist
- Calendar view fetches its displayed date range independently; map results are independent of grid pagination

**Visibility and invitations**

- Three visibility levels per event: `PUBLIC`, `FOLLOWERS_ONLY` and `INVITE_ONLY`
- Visibility is enforced on the server for the event list, event details and registration
- Event creators can invite their followers to invite-only events

**Social**

- Follow / unfollow other users
- Clickable followers, following and attendee lists leading to user profiles, with 20-at-a-time Load more controls
- Own and public profiles show organized events below followers/following, with upcoming/ongoing and past/cancelled views; event visibility remains server-enforced
- Profile statistics: total events attended, most visited categories and a fun "title" based on your favourite category; multi-category events count once in each category but once in the total

**Ratings**

- Confirmed registrants can leave or update one 1–5 star rating after an event ends; organizers cannot rate their own events
- Event ratings appear on cards and details after the event ends
- Organizer ratings on profiles aggregate the individual ratings across their events
- Eligibility verifies registration, not physical attendance or check-in

**Comments and reports**

- Visibility-protected event discussions with one level of replies, editing, pagination and comments remaining open after events end
- Authors can edit/delete their own comments; staff can remove others' comments
- Soft deletion hides the author/text while preserving visible replies
- Report comments for harassment, spam, inappropriate content or other reasons, with an optional explanation
- Staff review open, dismissed and removed reports, including the reported text snapshot; a new report on changed text can reopen a dismissed report
- Shared posting limit of 5 comments/replies per regular user per minute, with separate change/report limits and staff multipliers

**Notifications**

- In-app notification bell with unread counter and a "mark all as read" action
- Notifications for new events from followed users, event changes/cancellations, new followers, invitations, reminders, event comments and replies
- Successful joins notify the organizer in one unread group per event ("1 person joined..." / "5 people joined..."); organizer self-registration and failed joins do not notify. Reading starts a fresh group; clicking opens the event page
- Optional one-time rating prompts go to eligible confirmed nonorganizer attendees after the event ends, excluding cancelled events, already-rated events and events that ended before rollout. Submitting a rating removes an outstanding prompt
- Repeated comment/reply activity is grouped while unread; links open the relevant comment or reply thread
- Notifications support Load more beyond the initial 20 items
- **24-hour reminders** - a background job on the server runs every 15 minutes and notifies registered users whose event starts within 24 hours; a `reminderSent` flag tracks delivered reminders on each registration
- Rating prompts use the same startup/15-minute scheduler, with a durable sent flag and rollout boundary; overlapping workers do not duplicate prompts
- Old notifications are cleaned up automatically to keep the database small
- Client polling pauses when the browser tab is hidden to save backend resources

**Admin and moderator panel**

- Role-based access (`USER` / `MODERATOR` / `ADMIN`) checked against the current database role on protected requests
- Overview with platform statistics, including separate admin/moderator counts
- User management: server-side search by name/email, role/status filters and numbered pages of 20 results
- Timed or permanent bans with reasons, unbanning, and account deletion; banned users are hidden from relevant public listings
- Event management: server-side search/category/visibility filters, numbered pages of 20 results, and protected staff routes to view, edit, cancel and permanently delete events
- Event-table metadata wraps and actions stack; narrower screens use cards to avoid horizontal scrolling
- A **Manage in admin** shortcut on event details opens that exact event in the staff panel; normal event-page management controls remain organizer-only
- Comment-report moderation with dismiss/remove actions and author management
- Only admins can grant/revoke moderator privileges, using an in-app confirmation dialog
- Moderators cannot ban, unban or delete admin accounts
- Admin and moderator badges appear beside staff users

**UI**

- Dark mode
- Responsive layout (desktop and mobile navigation)
- Balanced event-card columns with two fixed card sizes for events with/without covers
- All selected categories appear as card icons with names on hover or keyboard focus
- Searchable category/cover menus, selected category tags, and "Other" placed last
- Event details show visibility below the title and equal-width category badges on the right
- Availability labels such as "8 places left", "Full", "Open places" and "Happening now" on cards and event details
- Styled confirmation dialogs with keyboard focus containment, busy states and inline failure/retry, including event/comment removal and user moderation
- Skeleton placeholders for event cards, event details, forms, profiles and smaller loading sections; animation respects reduced-motion preferences
- Actionable empty states with clear-filter, explore-event and create-event links
- Event states and active lists refresh at start/end boundaries and when the window regains focus

**Shared link previews**

- Public event links expose Open Graph metadata for Discord and other supported social-preview bots: event title, date (UTC), organizer, short description and selected cover
- Events without covers use a bundled branded EventTracker image; private/missing/unavailable events always use a generic preview without event details
- A Vercel function serves metadata in the initial HTML; normal browser visits keep the React interface. This is social sharing support, not full server-rendered SEO
- Requires deployment of both client and server, with the existing production `VITE_API_URL` configured in Vercel. A sleeping backend may cause a generic fallback; live platform routing must be checked after deployment

**Authentication and security**

- Email + password registration and login (bcrypt password hashing, JWT sessions)
- Sign in with Google
- Request validation with Zod, secure headers with Helmet, CORS allow-list, and rate limiting (stricter on auth routes)
- General request limits per 15 minutes: 300 for regular users, 900 for moderators and 1,500 for admins. Action limits use the same 1×/3×/5× multipliers; roles and bans are verified against the database on each request. Anonymous requests use IP-based limits, with an additional aggregate IP safety ceiling
- Login/register limits remain 20 attempts per IP per 15 minutes for all roles
- Email verification and password recovery are not implemented; email delivery is deferred pending a free setup

### Curated categories

Music; Arts & Culture; Film; Gaming; Nightlife; Sports; Fitness & Wellness; Outdoors & Adventure; Education; Workshops & DIY; Technology; Business & Networking; Social & Meetups; Food & Drink; Community & Volunteering; Birthdays & Celebrations; Family & Kids; Other.

The category migration seeds these choices and maps legacy event categories to them. Retired category records remain for reference; unrecognized legacy names map to Other. The first selected category is the main one, and recurring event instances inherit all selected categories and their cover.

Cover assets live in [`client/public/event-covers`](client/public/event-covers). See the [library preview](assets/event-covers/preview-40.jpg) and the [original](assets/event-covers/prompts.json) / [additional](assets/event-covers/additional-prompts.json) generation prompts.

## Tech Stack

| Layer      | Technology                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| Frontend   | React 19, TypeScript, Vite, React Router, Tailwind CSS 4, Axios, Leaflet / React-Leaflet, Lucide icons |
| Backend    | Node.js, Express 5, TypeScript                                                                         |
| Database   | PostgreSQL with Prisma ORM                                                                             |
| Auth       | JWT, bcrypt, Google OAuth (`@react-oauth/google`, `google-auth-library`)                               |
| Validation | Zod                                                                                                    |
| Hosting    | Vercel (client), Render (server), Neon (PostgreSQL)                                                    |

## Project Structure

```
.
├── client/                 # React single-page application
│   ├── public/event-covers/ # 40 bundled WebP illustrations
│   └── src/
│       ├── api/            # Axios API clients (auth, events, users, follow, notifications, admin...)
│       ├── components/     # Navbar, NotificationBell, EventForm, LocationPicker, ...
│       ├── context/        # AuthContext (and theme state)
│       ├── data/           # Curated cover catalog
│       ├── pages/          # Route-level pages (events, dashboard, profile, admin...)
│       ├── types/          # Shared TypeScript types
│       └── utils/          # Date formatting, helpers
├── assets/
│   ├── event-covers/       # Cover previews and generation prompts
│   └── screenshots/       # README screenshots with fictional demo data
└── server/                 # Express REST API
    ├── tests/              # Jest unit and API integration tests
    ├── prisma/
    │   ├── schema.prisma   # Data model
    │   └── migrations/     # SQL migrations
    └── src/
        ├── controllers/    # Request handlers
        ├── routes/         # Route definitions
        ├── middleware/     # requireAuth / optionalAuth / admin checks
        └── utils/          # JWT, recurrence, notifications, reminders, cleanup
```

Additional paths: `client/api/` (Vercel preview function), `client/share/` (metadata helper/tests), `client/public/share/` (fallback image), `assets/share/` (image source) and `server/scripts/` (explicit test/demo utilities).

## Data Model

Main entities (see `server/prisma/schema.prisma`):

- **User** - email/password or Google account, role (`USER` / `MODERATOR` / `ADMIN`), optional `bannedUntil` and `banReason`
- **Event** - creator, date range, location, visibility, capacity, recurrence, cancellation timestamp (`cancelledAt`), series-stop flag (`recurrenceStopped`) and optional curated `coverId` and persistent rating-prompt rollout boundary (`ratingPromptAfter`); many-to-many categories, with `categoryId` retaining the main category for compatibility
- **Registration** - a user's registration for an event, with `reminderSent` and `ratingPromptSent` delivery flags
- **EventInvite** - a user invited to an invite-only event
- **Follow** - follower / following relation between users
- **Notification** - typed in-app notification, including grouped joins, rating prompts and comments/replies, unread grouping and an optional comment target
- **Category** - curated event category; legacy/custom records are retired from selection
- **EventRating** - one editable rating per user/event
- **EventComment** - event discussion with a parent reference for replies and soft deletion
- **CommentReport** - reason, details, text snapshot and moderation status for a reported comment

## Usage Examples

### Organize an acoustic meetup

1. Open **Create event** and enter a title, description, date range and map location.
2. Choose **Music** and **Social & Meetups**, with Music as the main category.
3. Pick **Acoustic session** from the cover library, set capacity to 60 and choose **Public** visibility.
4. Publish the event. Visitors can discover it through either category, open its details, register and join the discussion. Confirmed registrants can rate it after it ends.

### Create the same event through the API

Send `POST /events` with `Authorization: Bearer <your-token>` and `Content-Type: application/json`:

```json
{
  "name": "Sunset acoustic session",
  "description": "An easygoing evening of acoustic music and good company.",
  "categoryIds": [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000013"
  ],
  "coverId": "music-acoustic",
  "date": "2030-06-14T16:00:00.000Z",
  "endDate": "2030-06-14T18:00:00.000Z",
  "location": "Demo Park",
  "latitude": 44.8,
  "longitude": 20.4,
  "maxCapacity": 60,
  "visibility": "PUBLIC"
}
```

The category IDs above are seeded by the migration for Music and Social & Meetups. Use `GET /categories` to look up available IDs, and choose future dates when trying the request.

Filtering by the secondary category also finds this event:

```http
GET /events?categoryId=00000000-0000-4000-8000-000000000013&sortBy=date_asc
```

## Labelled demonstration data

The hosted database includes 36 fictional public events across all 18 curated categories, created under three **Demo Organizer** accounts. Titles start with **[DEMO]**, and descriptions explicitly state that no real gathering or booking is taking place. Venue names are fictional; map points are illustrative city locations, not actual event venues. Dates are future dates from the time the batch was created, and do not advance automatically.

Only each organizer's normal registration was created. Attendees, ratings, comments and follows were not fabricated. The batch is non-recurring and does not send creation notifications. Demo organizer emails use the reserved `example.test` domain, with no password or Google login configured.

The batch record is [assets/demo-events/demo-events-2026-11-03.json](assets/demo-events/demo-events-2026-11-03.json), containing the fictional account/event IDs for review or later cleanup. `server/scripts/seed-demo-events.cjs` is an explicit, idempotent utility; it never runs during startup, migrations or deployment:

```bash
# Review the plan without connecting to a database
node server/scripts/seed-demo-events.cjs --dry-run
# Only on an explicitly approved Neon target configured in server/.env
node server/scripts/seed-demo-events.cjs --apply-neon
```

Rerunning the same batch skips existing records rather than duplicating or rescheduling them. The utility creates the batch transactionally and leaves saved environment settings unchanged.

## API Overview

Routes marked with 🔒 require an `Authorization: Bearer <token>` header. Routes marked with 🛡️ additionally require `ADMIN` or `MODERATOR`; moderator role changes are admin-only.

**Auth**

| Method | Endpoint         | Description                      |
| ------ | ---------------- | -------------------------------- |
| POST   | `/auth/register` | Register with email and password |
| POST   | `/auth/login`    | Log in                           |
| POST   | `/auth/google`   | Sign in with Google              |

**Events**

| Method | Endpoint                                     | Description                                                                |
| ------ | -------------------------------------------- | -------------------------------------------------------------------------- |
| GET    | `/events`                                    | List events visible to the requester (`?includePast=true` for past events) |
| GET    | `/events/:id`                                | Event details and viewer registration (visibility enforced)                |
| GET    | `/events/:id/attendees`                      | Paginated attendees, with event visibility checks                         |
| GET    | `/events/:id/share`                          | Anonymous public-only metadata for sharing; no private-event details       |
| POST   | `/events` 🔒                                 | Create an event                                                            |
| PUT    | `/events/:id` 🔒                             | Update an event (creator only)                                             |
| DELETE | `/events/:id` 🔒                             | Delete an event (creator only)                                             |
| POST   | `/events/:id/cancel` 🔒                   | Permanently cancel an owned event (`OCCURRENCE` / `SERIES`)                 |
| POST   | `/events/:id/register` 🔒                    | Register for an event                                                      |
| DELETE | `/events/:id/register` 🔒                    | Cancel registration                                                        |
| POST   | `/events/:id/invites` 🔒                     | Invite a follower to an invite-only event                                  |
| GET    | `/events/:id/invites` 🔒                     | List invited users (creator only)                                          |
| PUT    | `/events/:id/rating` 🔒                      | Set/update an ended event's rating (`score`: 1–5)                          |
| GET    | `/events/:id/comments`                       | Read comments/replies with visibility checks and cursor pagination         |
| POST   | `/events/:id/comments` 🔒                    | Post a comment or reply (`body`, optional `parentId`)                      |
| PUT    | `/events/:id/comments/:commentId` 🔒         | Edit your own comment                                                      |
| DELETE | `/events/:id/comments/:commentId` 🔒         | Delete your own comment, or remove as staff                                |
| POST   | `/events/:id/comments/:commentId/reports` 🔒 | Report a comment (`reason`, optional `details`)                            |

Event create/update requests accept `categoryIds` (1–3 distinct curated IDs, main first) and optional `coverId` (an ID from the bundled cover catalog, or `null` to remove). An omitted field is preserved during partial edits. The legacy `categoryId` field remains accepted for a single-category selection; it must agree with the first ID when both forms are supplied.

For date edits, the final `endDate` must be later than `date`. Omitted values retain their stored value; `endDate: null` removes the optional end time. Events without an end time count as ended at their start time. Registration closes at the start regardless of whether an end time is provided.

List filters include `categoryId`, `search`, `city`, `sortBy` (`date_asc`, `date_desc`, `name_asc`, `name_desc`), `includePast`, `organizerId` and authenticated `attendedOnly`. A category filter matches any selected category. Authenticated dashboard links use `scope=organized`, `registered` or `following`; paired `from` / `to` ISO timestamps restrict calendar results to a date range.

### Pagination

`GET /events?page=1&pageSize=12` returns `{ items, total, page, pageSize, totalPages }`. Admin users/events, followers/following, notifications and creator-only invitation lists also accept `page` / `pageSize`, using 20 items by default. Page sizes are capped at 100. Clients reset page selection after filter changes and recover when the last page shrinks. Existing requests without `page` retain their legacy array response (notifications retain their initial 20-item limit).

`GET /events/:id/attendees` always returns the paginated shape; full attendee lists are separate from the viewer's registration in event details. Creator-only `/events/:id/invites?kind=available&page=1` lists eligible uninvited followers; the default kind lists existing invitations. Follower responses also include viewer `isFollowing` separately from the loaded slice, so follow status and total counts remain accurate.

Admin filters run before paging: users accept `search`, `role`, `status`; events accept `search`, `categoryId`, `visibility` and exact-event `event`. Comments/replies and comment reports keep their existing cursor-based Load more behavior.

**Categories**

| Method | Endpoint          | Description                                     |
| ------ | ----------------- | ----------------------------------------------- |
| GET    | `/categories`     | List the 18 curated categories, with Other last |
| GET    | `/categories/:id` | Get a selectable curated category               |

**Users and social**

| Method | Endpoint                   | Description           |
| ------ | -------------------------- | --------------------- |
| GET    | `/users/me` 🔒             | Current user profile  |
| GET    | `/users/me/stats` 🔒       | Attendance statistics |
| GET    | `/users/me/dashboard` 🔒   | Dashboard data        |
| GET    | `/users/:id`               | Public user profile   |
| POST   | `/users/:userId/follow` 🔒 | Follow a user         |
| DELETE | `/users/:userId/follow` 🔒 | Unfollow a user       |
| GET    | `/users/:userId/followers` | List followers        |
| GET    | `/users/:userId/following` | List followed users   |

**Notifications**

| Method | Endpoint                         | Description                    |
| ------ | -------------------------------- | ------------------------------ |
| GET    | `/notifications` 🔒              | Notifications (optional pagination) |
| GET    | `/notifications/unread-count` 🔒 | Number of unread notifications |
| PATCH  | `/notifications/:id/read` 🔒     | Mark one as read               |
| PATCH  | `/notifications/read-all` 🔒     | Mark all as read               |

**Admin**

| Method | Endpoint                              | Description                                                |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| GET    | `/admin/stats` 🛡️                     | Platform statistics                                        |
| GET    | `/admin/users` 🛡️                     | List all users                                             |
| PATCH  | `/admin/users/:id/ban` 🛡️             | Ban a user                                                 |
| PATCH  | `/admin/users/:id/unban` 🛡️           | Unban a user                                               |
| GET    | `/admin/events` 🛡️                    | List all events                                            |
| PUT    | `/admin/events/:id` 🛡️                | Edit any event                                             |
| DELETE | `/admin/events/:id` 🛡️                | Delete any event                                           |
| POST   | `/admin/events/:id/cancel` 🛡️           | Permanently cancel an event through staff tools                           |
| DELETE | `/admin/users/:id` 🛡️                 | Delete a user (moderators cannot delete admins)            |
| PATCH  | `/admin/users/:id/role` 🛡️            | Admin-only: grant/revoke moderator (`USER` or `MODERATOR`) |
| GET    | `/admin/comment-reports` 🛡️           | List the comment-report queue                              |
| PATCH  | `/admin/comment-reports/:reportId` 🛡️ | Dismiss a report or remove the comment                     |

## Getting Started

### Prerequisites

- Node.js 22.12+ and npm (or a compatible Node 20 release starting at 20.19)
- A PostgreSQL database (local installation or a hosted one such as [Neon](https://neon.tech))
- A Google OAuth Client ID (for "Sign in with Google") - create one in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### 1. Clone the repository

```bash
git clone https://github.com/M1hailo1/Event-Tracker.git
cd Event-Tracker
```

### 2. Set up the server

```bash
cd server
npm install
```

Create `server/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/eventtracker"
# Optional: separate Neon target used only for explicit hosted migration runs
# NEON_ONLINEDATA_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
JWT_SECRET="a-long-random-secret-string"
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
PORT=3000
```

Apply database migrations and generate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

Start the API:

```bash
npm run dev
```

The server runs on `http://localhost:3000`. The reminder job starts together with the server.

> **Categories:** migrations seed all 18 curated categories automatically. Do not manually seed the retired category list. Use `npx prisma migrate dev --name <change>` when developing a new schema change; use `migrate deploy` to apply committed migrations.

> **Admin account:** to create an admin, register a normal account and then set its `role` to `ADMIN` in the database (for example with `npx prisma studio`).

> **CORS:** allowed origins are defined in `server/src/app.ts`. Add the URL of your deployed frontend there.

### 3. Set up the client

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL="http://localhost:3000"
VITE_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
```

Start the development server:

```bash
npm run dev
```

The app runs on `http://localhost:5173`.

## Available Scripts

**Server** (`/server`)

| Command         | Description                                                                          |
| --------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`   | Start the API with hot reload (`tsx watch`)                                          |
| `npm run build` | Compile TypeScript to `dist/`                                                        |
| `npm start`     | Run the compiled server                                                              |
| `npm test`      | Run Jest through `.env.test` (DB integration tests require a migrated test database) |
| `npm run test:reliability` | Run lifecycle, cancellation, pagination, sharing privacy and participation-notification integration tests in a disposable local database |

`server/scripts/` contains developer utilities and should be committed with the project. Its reliability runner is invoked explicitly; it is not part of API startup. The runner reads the local `DATABASE_URL`, refuses hosted targets, creates a uniquely named test database, applies existing migrations, runs the integration suite and removes the database afterward. The PostgreSQL role needs permission to create/drop that database. Saved `.env` files and application records are not changed.

```bash
cd server
npm run test:reliability
```

The integration tests cover simultaneous requests for the final seat, duplicate registrations, organizer capacity, ongoing-event discovery and registration closure, rating eligibility, owner/staff date edits, recurring duration, permanent cancellation, retained discussions, attendee notifications, staff-route permissions, and cancellation races with joining/reminders/series generation. The suite also covers organizer-profile visibility, stable pagination, full follower counts, attendee membership, invitation/notification pages, public-only share metadata, grouped joins, one-time rating prompts and rating/worker races. The isolated suites are skipped by regular `npm test`; use the command above to run them safely. Unit/API tests also verify role-based quotas, immediate role revocation and rejection of client-supplied role claims.

**Client** (`/client`)

| Command           | Description                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Start the Vite dev server           |
| `npm run build`   | Type-check and build for production |
| `npm run lint`    | Run ESLint                          |
| `npm run preview` | Preview the production build        |
| `npm run test:share` | Test preview metadata, escaping, public-only fallbacks and bot routing |

## Deployment

- **Client** - deployed on Vercel with `client/` as the project root. `client/vercel.json` sends supported social-preview bots on event URLs to `client/api/event-preview.mjs`, then falls back to `index.html` for normal React navigation. Set `VITE_API_URL` (the production API origin) and `VITE_GOOGLE_CLIENT_ID` in Vercel settings; the preview function also reads `VITE_API_URL` at runtime. Vite dev/preview alone does not emulate Vercel bot rewrites. Deploy the backend sharing endpoint too, then verify a public and a private event link in the target platform.
- **Database** - PostgreSQL on Neon. Keep local `DATABASE_URL` and hosted `NEON_ONLINEDATA_URL` separate. From `server/`, the following PowerShell example reads the Neon target from `.env`, temporarily overrides only the shell process, applies committed migrations and restores the previous target:

  ```powershell
  $neonDatabaseUrl = node -p "require('dotenv').config({ quiet: true }).parsed.NEON_ONLINEDATA_URL || ''"
  if (-not $neonDatabaseUrl) { throw "Set NEON_ONLINEDATA_URL in server/.env first." }
  $previousDatabaseUrl = $env:DATABASE_URL
  try {
    $env:DATABASE_URL = $neonDatabaseUrl
    npx.cmd prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "Migration failed." }
    npx.cmd prisma migrate status
  } finally {
    $env:DATABASE_URL = $previousDatabaseUrl
    Remove-Variable neonDatabaseUrl
  }
  ```

  This does not edit `.env`. Use `migrate deploy` for hosted databases, not `migrate dev`.

- **Server** - on any Node.js host. Make sure the Prisma client is generated during the build (for example by adding `"postinstall": "prisma generate"` to the server `package.json`) and that `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` and `PORT` are set as environment variables.

> **Note on scheduling:** pre-event reminders and post-event rating prompts run inside the server process at startup and every 15 minutes. Rating prompts process up to 100 due registrations per check. Free-host sleep and backlogs can delay delivery; no external scheduler has been configured.

## Roadmap

- [ ] AI-powered event recommendations
- [ ] Saved events / wishlist
- [ ] Ticketing system
- [ ] QR code check-in
- [ ] Offline support through a Progressive Web App (PWA)
- [ ] Mobile app
- [ ] Complete UI redesign
- [x] Rich link previews when sharing events (Open Graph embeds; verify after deployment)
- [ ] Email notifications, reminders and account verification
- [ ] Forgot-password / password recovery
- [ ] Move reminder scheduling to an external cron job
- [ ] User-uploaded event images with moderation

## Author

**Mihailo Maricic** - [GitHub](https://github.com/M1hailo1)
