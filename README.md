# Event Tracker

A full-stack web application for creating, discovering and attending events. Users can publish events on an interactive map, control who can see them, follow other users, and get notified about everything that matters to them. Admins get a dedicated panel to moderate users and events.

Built as a diploma (thesis) project.

**Live demo:** https://event-tracker-liard-seven.vercel.app

<img width="1098" height="417" alt="image" src="https://github.com/user-attachments/assets/4c8aa48e-d6b7-4ffd-af3d-58fec531fb58" />

## Features

**Events**

- Create, edit and delete events with name, description, category, date range, capacity and location
- Pick the event location on an interactive map (Leaflet + OpenStreetMap) with automatic reverse geocoding of the address
- Map display of events, so you can browse what is happening and where
- Recurring events (daily, weekly, monthly, yearly) - upcoming instances are generated automatically
- Register / unregister from events, with capacity limits and a public attendee list
- Filtering and sorting of the event list
- Upcoming and past events views, plus an attended-events history filter

**Dashboard and calendar**

- Events you are attending
- Events you are organizing
- Upcoming events from people you follow that you have not registered for yet
- Calendar view of events

**Visibility and invitations**

- Three visibility levels per event: `PUBLIC`, `FOLLOWERS_ONLY` and `INVITE_ONLY`
- Visibility is enforced on the server for the event list, event details and registration
- Event creators can invite their followers to invite-only events

**Social**

- Follow / unfollow other users
- Clickable followers, following and attendee lists leading to user profiles
- Profile statistics: total events attended, most visited categories and a fun "title" based on your favourite category

**Notifications**

- In-app notification bell with unread counter and a "mark all as read" action
- Notifications for: new event from someone you follow, event updated, event cancelled, new follower, event invitations and event reminders
- **24-hour reminders** - a background job on the server runs every 15 minutes and notifies registered users whose event starts within 24 hours; a `reminderSent` flag on each registration guarantees a reminder is never sent twice
- Old notifications are cleaned up automatically to keep the database small
- Client polling pauses when the browser tab is hidden to save backend resources

**Admin panel**

- Role-based access (`USER` / `ADMIN`) enforced by server-side middleware
- Overview with platform statistics (users, events, upcoming events, registrations, categories)
- User management: search by name or email, filter by role and status
- **Ban / unban** users instead of deleting accounts - banned users are soft-hidden from the app, and the action is fully reversible
- Event management: view, edit and delete any event
- Admin badge shown next to admin users

**UI**

- Dark mode
- Responsive layout (desktop and mobile navigation)
- Loading states for data-heavy pages

**Authentication and security**

- Email + password registration and login (bcrypt password hashing, JWT sessions)
- Sign in with Google
- Request validation with Zod, secure headers with Helmet, CORS allow-list, and rate limiting (stricter on auth routes)

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
│   └── src/
│       ├── api/            # Axios API clients (auth, events, users, follow, notifications, admin...)
│       ├── components/     # Navbar, NotificationBell, EventForm, LocationPicker, ...
│       ├── context/        # AuthContext (and theme state)
│       ├── pages/          # Route-level pages (events, dashboard, profile, admin...)
│       ├── types/          # Shared TypeScript types
│       └── utils/          # Date formatting, helpers
└── server/                 # Express REST API
    ├── prisma/
    │   ├── schema.prisma   # Data model
    │   └── migrations/     # SQL migrations
    └── src/
        ├── controllers/    # Request handlers
        ├── routes/         # Route definitions
        ├── middleware/     # requireAuth / optionalAuth / admin checks
        └── utils/          # JWT, recurrence, notifications, reminders, cleanup
```

## Data Model

Main entities (see `server/prisma/schema.prisma`):

- **User** - account (email/password or Google) with a `role` (`USER` / `ADMIN`) and an `isBanned` flag
- **Event** - belongs to a **Category**, has a creator, visibility, optional capacity and recurrence
- **Registration** - a user's registration for an event, with a `reminderSent` flag
- **EventInvite** - a user invited to an invite-only event
- **Follow** - follower / following relation between users
- **Notification** - typed in-app notification (`NEW_EVENT_FROM_FOLLOWED`, `EVENT_UPDATED`, `EVENT_CANCELLED`, `EVENT_REMINDER`, `NEW_FOLLOWER`, `EVENT_INVITE`)
- **Category** - predefined or user-created (custom) event categories

## API Overview

Routes marked with 🔒 require an `Authorization: Bearer <token>` header. Routes marked with 🛡️ additionally require the `ADMIN` role.

**Auth**

| Method | Endpoint         | Description                      |
| ------ | ---------------- | -------------------------------- |
| POST   | `/auth/register` | Register with email and password |
| POST   | `/auth/login`    | Log in                           |
| POST   | `/auth/google`   | Sign in with Google              |

**Events**

| Method | Endpoint                  | Description                                                                |
| ------ | ------------------------- | -------------------------------------------------------------------------- |
| GET    | `/events`                 | List events visible to the requester (`?includePast=true` for past events) |
| GET    | `/events/:id`             | Event details (visibility enforced)                                        |
| POST   | `/events` 🔒              | Create an event                                                            |
| PUT    | `/events/:id` 🔒          | Update an event (creator only)                                             |
| DELETE | `/events/:id` 🔒          | Delete an event (creator only)                                             |
| POST   | `/events/:id/register` 🔒 | Register for an event                                                      |
| DELETE | `/events/:id/register` 🔒 | Cancel registration                                                        |
| POST   | `/events/:id/invites` 🔒  | Invite a follower to an invite-only event                                  |
| GET    | `/events/:id/invites` 🔒  | List invited users (creator only)                                          |

**Categories**

| Method | Endpoint          | Description                |
| ------ | ----------------- | -------------------------- |
| GET    | `/categories`     | List predefined categories |
| GET    | `/categories/:id` | Get a category             |
| POST   | `/categories` 🔒  | Create a custom category   |

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
| GET    | `/notifications` 🔒              | Latest notifications           |
| GET    | `/notifications/unread-count` 🔒 | Number of unread notifications |
| PATCH  | `/notifications/:id/read` 🔒     | Mark one as read               |
| PATCH  | `/notifications/read-all` 🔒     | Mark all as read               |

**Admin**

| Method | Endpoint                    | Description         |
| ------ | --------------------------- | ------------------- |
| GET    | `/admin/stats` 🛡️           | Platform statistics |
| GET    | `/admin/users` 🛡️           | List all users      |
| PATCH  | `/admin/users/:id/ban` 🛡️   | Ban a user          |
| PATCH  | `/admin/users/:id/unban` 🛡️ | Unban a user        |
| GET    | `/admin/events` 🛡️          | List all events     |
| PUT    | `/admin/events/:id` 🛡️      | Edit any event      |
| DELETE | `/admin/events/:id` 🛡️      | Delete any event    |

## Getting Started

### Prerequisites

- Node.js 20+ and npm
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
JWT_SECRET="a-long-random-secret-string"
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
PORT=3000
```

Apply database migrations and generate the Prisma client:

```bash
npx prisma migrate dev
```

Start the API:

```bash
npm run dev
```

The server runs on `http://localhost:3000`. The reminder job starts together with the server.

> **Categories:** predefined categories (e.g. Music, Sport, Education, Fun, Birthday, Conference, Charity) live in the `Category` table with `isCustom = false`. Add them once, for example through `npx prisma studio`.

> **Admin account:** to create an admin, register a normal account and then set its `role` to `ADMIN` in the database (for example with `npx prisma studio`).

> **CORS:** allowed origins are defined in `server/src/index.ts`. Add the URL of your deployed frontend there.

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

| Command         | Description                                 |
| --------------- | ------------------------------------------- |
| `npm run dev`   | Start the API with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/`               |
| `npm start`     | Run the compiled server                     |

**Client** (`/client`)

| Command           | Description                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Start the Vite dev server           |
| `npm run build`   | Type-check and build for production |
| `npm run lint`    | Run ESLint                          |
| `npm run preview` | Preview the production build        |

## Deployment

- **Client** - deployed on Vercel. `client/vercel.json` rewrites all routes to `index.html` so client-side routing works on refresh. Set `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` in the Vercel project settings.
- **Database** - PostgreSQL on Neon. Apply migrations to the production database with:

  ```bash
  # PowerShell
  $env:DATABASE_URL="<your-neon-connection-string>"
  npx prisma migrate deploy
  ```

  ```bash
  # bash
  DATABASE_URL="<your-neon-connection-string>" npx prisma migrate deploy
  ```

- **Server** - on any Node.js host. Make sure the Prisma client is generated during the build (for example by adding `"postinstall": "prisma generate"` to the server `package.json`) and that `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` and `PORT` are set as environment variables.

> **Note on reminders:** the 24-hour reminder job runs inside the server process (every 15 minutes). On hosting plans that put the server to sleep when idle, reminders are only sent while the server is awake.

## Roadmap

- [ ] Invite any user (search by name), not only followers
- [ ] Approval flow for event registrations (`PENDING` / `CONFIRMED` / `CANCELLED` statuses are already prepared in the schema)
- [ ] Real-time notifications (Server-Sent Events or WebSockets) instead of polling

## Author

**Mihailo Maricic** - [GitHub](https://github.com/M1hailo1)
