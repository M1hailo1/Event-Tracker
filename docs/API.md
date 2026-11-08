# API reference

Routes marked with 🔒 require an `Authorization: Bearer <token>` header. Routes marked with 🛡️ additionally require `ADMIN` or `MODERATOR`; moderator role changes are admin-only.

New passwords require at least 8 characters. Registration and login reject passwords exceeding 72 UTF-8 bytes; existing shorter passwords can still log in. Validation errors use `{ error: { fieldErrors, formErrors } }`; other errors generally use `{ error: string }`.

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
| GET | `/events/saved-ids` 🔒 | IDs of the signed-in viewer's currently visible saved events |
| PUT | `/events/:id/save` 🔒 | Idempotently save this occurrence without registering attendance |
| DELETE | `/events/:id/save` 🔒 | Remove your save, including after event access is lost |
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

List filters include `categoryId`, `search`, `city`, `sortBy` (`date_asc`, `date_desc`, `name_asc`, `name_desc`), `includePast`, `organizerId` and authenticated `attendedOnly`. A category filter matches any selected category. Authenticated dashboard links use `scope=organized`, `registered`, `following` or `saved`; paired `from` / `to` ISO timestamps restrict calendar results to a date range.

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
| GET    | `/admin/audit-history`                 | Admin-only paginated staff audit history                    |
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

`GET /admin/audit-history` requires the current database role `ADMIN`; moderator access is denied. It returns `{ items, total, page, pageSize, totalPages }`, defaults to 20 entries and orders newest first with an ID tie-breaker. Optional filters: `action` (an `AuditAction` enum value), `actor` (staff name substring or exact ID), and `from` / `to` (`YYYY-MM-DD`, inclusive UTC dates). Responses use `Cache-Control: no-store`. Entries contain actor ID/name/role, action/time, target ID/type/label and action-specific details. No history mutation endpoints are exposed.
