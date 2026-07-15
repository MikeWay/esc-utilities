# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a monorepo for the `exe-sc-tools` Lightsail container service.

| Path | Purpose |
|---|---|
| `src/`, `Dockerfile`, `client.html`, etc. | **mealstock** app (root of repo) |
| `scm-tools/` | **scm-tools** subproject (git subtree from `MikeWay/scm-tools`) |
| `nginx/` | Shared nginx reverse-proxy image |
| `postgres-s3/` | Shared postgres+S3-backup image |
| `deploy.sh` | Unified build + push + deploy script |
| `exe-sc-tools-deploy.json` | Lightsail deployment config — **gitignored**, keep locally |

### Deploying everything

```bash
./deploy.sh
```

Before building, `deploy.sh` triggers an immediate S3 backup of the live database and waits for
it to complete (up to 30 s). It then builds mealstock, scm-tools, and postgres-s3 images, pushes
them to Lightsail, updates `exe-sc-tools-deploy.json` with the new image tags, and triggers a
single deployment.

### Pulling in scm-tools updates

```bash
git subtree pull --prefix=scm-tools https://github.com/MikeWay/scm-tools.git main --squash
```

### Adding BoatManager (future)

```bash
git subtree add --prefix=boatmanager <boatmanager-remote-url> main --squash
```
Then add a build stanza to `deploy.sh`, a container entry to `exe-sc-tools-deploy.json`, and
an nginx `location /boatmanager/` block.

## Commands

```bash
# Install dependencies (first time)
npm install

# Compile TypeScript
npm run build

# Set up database tables and run migrations (run once, after building)
npm run setup-db

# Start the server (after building)
npm start
```

The server runs on port 3000 (overridable via `PORT` env var). Access the app at `http://localhost:3000`.

To watch for changes during development: `npx tsc --watch`

## Configuration

Edit `src/db-config.ts` before starting — it exports the PostgreSQL connection config (`host`, `port`, `database`, `user`, `password`).

### Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default: 3000) |
| `SESSION_SECRET` | Express session secret (required in production) |
| `APP_BASE_URL` | Full public URL (e.g. `https://example.com`) — used in OAuth callbacks and emails |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enable Google OAuth login |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Enable Facebook OAuth login |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Enable Microsoft OAuth login |
| `SMTP_HOST` | SMTP server hostname (enables email features) |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials (omit for unauthenticated relay) |
| `SMTP_FROM` | From address for outbound emails |

OAuth providers are enabled only when their env vars are set. Email features (new-user notifications, password reset) are enabled only when `SMTP_HOST` is set.

## Architecture

TypeScript sources live in `src/`, compiled output goes to `dist/` (gitignored). The app is a single Node.js process.

**Source files:**
- `src/server.ts` — Express app setup, WebSocket server, all DB helpers, main entry point
- `src/routes.ts` — Auth routes (`/login`, `/auth/*`, `/pending`) and admin routes (`/admin`, `/admin/*`)
- `src/auth.ts` — Passport strategies (local + OAuth), `requireAuth`/`requireAdmin` middleware, password reset token helpers
- `src/mailer.ts` — Nodemailer wrappers for new-user notifications and password reset emails
- `src/setup-db.ts` — `npm run setup-db` target: creates all tables, runs one-time migrations
- `src/db-config.ts` — PostgreSQL connection config

**`src/server.ts`** combines three concerns in one process:
- An Express app serving `client.html` at `/`, audit JSON at `/audit`, version info at `/version` (public — no auth required)
- A `WebSocketServer` (from the `ws` package) attached to the same HTTP server, in `noServer` mode — WebSocket upgrades are validated for auth/approval before being handed off
- A PostgreSQL connection pool (`pg`) for all persistence

**Client reconnect behaviour**: `ws.onclose` immediately calls `checkVersion()`. If the server
version changed (redeployment), the page reloads. If the session expired, `/version` returns
normally (it's public) and the JSON version change triggers a reload to the login page. This
prevents clients from being stuck on "Reconnecting…" after a deployment.

**`pagehide` handler** (`client.html`): on tab close / navigation, flushes any unsaved numeric
cell edit via `handleInput()` and sends a `backup_db` WS message to trigger an S3 backup.

**State flow**: On each WebSocket connection the server sends a `full_state` message containing all weeks, dishes, session data, and freezer options. Clients send mutation messages (see below). The server writes to PostgreSQL in a transaction, patches `cachedState` in place or reloads it, then broadcasts the change to all other connected clients.

**In-memory cache**: `cachedState` (`AppState | null`) is a module-level variable. It's used to resolve `dbId` references when processing `cell_update` messages (clients reference items by array index, not database ID). The cache is reloaded from DB after structural mutations (`add_week`, `add_dish`, `delete_week`, `reset_session`, `update_freezer` options); for cell-level updates it's patched in place.

**Key types** (defined in `src/server.ts`):
- `Category` — `'Meat' | 'Non-Meat' | 'Desserts'`
- `MutableDishField` — `'start' | 'ordered' | 'corrections'`
- `Dish` — includes `dbId`, `name`, `diet`, `freezer`, `start`, `ordered`, `corrections`, `sessions`
- `Week`, `AppState` — the in-memory state tree; `AppState` includes `activeWeek`, `weeks`, `freezerOptions`
- `CellUpdateMsg` — shape of a `cell_update` WebSocket message

**WebSocket messages (client → server):**
- `cell_update` — update a numeric field (`start`, `ordered`, `corrections`, or `session`)
- `set_active_week` — change the active week index (server validates bounds before writing)
- `add_week` — add a new week (copies dishes from last week with rolled-over stock); also triggers an S3 backup
- `add_dish` — add a dish to all existing weeks
- `log_order` — increment ordered count for a dish
- `delete_week` — delete a future week (carries stock forward to next week if one exists); also triggers an S3 backup
- `update_freezer` — set the freezer label for a dish
- `backup_db` — request an immediate S3 backup (sent by the `pagehide` handler when a user leaves the page)

Note: `start` edits are blocked for non-first weeks (`cell_update` with `field === 'start'` and `weekIdx > 0` is silently dropped).

## Authentication & User Management

All routes except `/login`, `/auth/*`, `/pending` require authentication. WebSocket upgrades also require an authenticated, approved user session.

**User lifecycle**: The first user to register is automatically approved and made admin. Subsequent users start unapproved and an email notification is sent to all admins. Admins approve/reject users at `/admin`.

**Login methods**: local email+password, and optionally Google / Facebook / Microsoft OAuth (each enabled by its env vars). OAuth accounts can also have a local password set by an admin.

**Password rules**: min 8 chars, at least one uppercase, one lowercase, one digit.

**Password reset**: `/auth/forgot-password` → emails a one-time link valid for 1 hour.

## Admin Panel (`/admin`)

Admin-only. Provides:
- **User management** — approve, reject, promote to admin, demote, remove users
- **Set user password** — set a local password for any user (including OAuth-only accounts)
- **Reset session** — zeroes all session usage and corrections for a selected week
- **Import stock** — upload a CSV (`Category, Dish, Dietary Info, Start Number`) to bulk-update start quantities; optionally wipes all existing weeks first
- **Delete week** — permanently deletes a future week; rolls leftover stock forward to the next week
- **Freezer options** — add/remove the dropdown values shown in the Freezer column
- **Global reset** — zeroes start, ordered, corrections, and all session values across all weeks
- **Backup to S3** — triggers an immediate `pg_dump` upload to S3; blocks until complete; use before any schema migration
- **SQL query** — run arbitrary SQL (read or write)

### `POST /admin/backup` endpoint

Accepts either an admin session cookie or an `Authorization: Bearer <token>` header where the
token is `sha256(SESSION_SECRET + ':s3backup')`. `deploy.sh` derives and uses this token
automatically. Returns `{"ok":true,"backedUpAt":"<timestamp>"}` or a 504 on timeout.

## Database Schema

Eight tables:

- `weeks` — weekly meal plan periods (`label`, `sort_order`)
- `dishes` — one row per dish per week (`week_id` FK, `category`, `sort_order`, `name`, `diet`, `freezer`, `start`, `ordered`, `corrections`)
- `sessions` — one row per dish per session slot (`dish_id` FK, `session_idx` 0–7, `session_name`, `used`)
- `audit_log` — append-only record of every field change (`device_ip`, `user_name`, `week_label`, `dish_name`, `category`, `field`, `old_value`, `new_value`)
- `app_settings` — key/value store; keys: `active_week_id`, `backup_requested_at`, `last_backup_at`
- `users` — registered users (`email`, `display_name`, `password_hash`, `google_id`, `facebook_id`, `microsoft_id`, `approved`, `is_admin`)
- `freezer_options` — available freezer labels for the dropdown (`label`, `sort_order`)
- `password_reset_tokens` — one-time tokens for password reset (`user_id` FK, `token_hash`, `expires_at`, `used`)

The 8 session slots are fixed and named in order: `Tues Improv`, `Tues Cruisers`, `Wed Diners`, `Wed Dinghies`, `Thurs Diners`, `Thurs Juniors`, `Thurs Cruisers`, `Friday`. Session `used` values are stored as **positive** integers.

Dish categories are exactly three strings: `Meat`, `Non-Meat`, `Desserts`.

## S3 Backup Mechanism

The `postgres-s3/` container image wraps the official PostgreSQL image with an S3 backup layer.
On startup it restores from `s3://$S3_BUCKET/mealstock.dump` if one exists. It then runs two
background loops:

1. **On-demand poller** (every 2 s) — reads `app_settings` and runs `pg_dump` + `aws s3 cp`
   whenever `backup_requested_at > last_backup_at`. After a successful upload it writes
   `last_backup_at = NOW()` so the app can detect completion.
2. **Scheduled loop** (every 15 min) — unconditional `pg_dump` + upload; also writes `last_backup_at`.

Backup is skipped only when `S3_BACKUP_DISABLED=true` (exact string). Any other value (including
`"false"`) enables backups.

Triggers that write `backup_requested_at`:
- `backup_db` WS message (sent by client `pagehide` handler)
- `add_week` / `delete_week` WS handlers (server-side, fire-and-forget)
- `POST /admin/backup` (sets the flag, then polls `last_backup_at` for up to 30 s)
- `deploy.sh` pre-deploy step (calls `/admin/backup` and waits)

## Week Tab Windowing

The week tab bar shows at most 3 tabs at a time. When there are more than 3 weeks:
- ← / → buttons appear to shift the visible window by one.
- The window defaults to the 3 most recent weeks on load and after any `full_state` broadcast.
- Switching to a week outside the current window automatically repositions the window.

State is tracked in the client-side variable `tabWindowStart` (index of the first visible tab).

## Adding a New Week

`addWeek()` copies dish names, diet, and freezer info from the previous week, setting each dish's `start` to the calculated remainder (`start + ordered + corrections - sum(sessions)`), floored at 0. All session `used` values reset to 0. New dishes added via `add_dish` are inserted into **all** existing weeks simultaneously.
