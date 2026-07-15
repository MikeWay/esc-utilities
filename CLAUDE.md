# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Boat check-out/check-in management system for Exe Sailing Club. Members use the Angular kiosk UI to check boats in/out; admins use a server-rendered EJS interface for reports, defect management, and user administration.

- **Production URL**: https://ribmanager.exe-sailing-club.org/
- **Frontend**: Angular 20 (standalone components, Angular Material azure-blue theme) at `src/app/`
- **Backend**: Express + TypeScript at `server/src/`, compiled to `server/dist/`
- **Database**: AWS DynamoDB (eu-west-1)
- **Built frontend**: compiled to `server/public/browser/`, served statically by Express

## Build Commands

### From project root
```bash
npm run build              # Angular production build only
npm run build-all-prod     # Full production build (Angular + server) — run before deploying
npm start                  # Angular dev server at http://localhost:4200
```

### Server only (from `server/`)
```bash
npm run build              # Dev TypeScript compile
npm run build:prod         # Production TypeScript compile (swaps environment files)
npm start                  # Start server at http://localhost:3000 (loads SMTP env vars)
npm run lint               # ESLint over src/**
```

### Testing
```bash
npm test                         # Angular unit tests (Karma/Jasmine)
cd server && npm test            # Server unit tests (Jest)
cd server && npm run coverage    # Jest with coverage
npm run e2e                      # Playwright E2E (requires server running on :3000)
npm run e2eui                    # Playwright UI mode
npm run gentest                  # Playwright codegen at localhost:4200
```

## Version System

A pre-commit hook at `.githooks/pre-commit` auto-bumps the version by 0.01 on every commit, updating three files simultaneously:
- `server/src/version.ts`
- `src/environments/environment.ts`
- `src/environments/environment.development.ts`

On startup in production, the Angular app calls `GET /api/version` and shows a "please refresh" banner if the server version differs from the compiled-in client version. Do not skip the pre-commit hook.

Git hooks setup (one-time): `git config core.hooksPath .githooks`

## Deployment

- **Production server**: `bitnami@ribmanager.exe-sailing-club.org` (AWS Lightsail, eu-west-2)
- **SSH key**: `~/.ssh/LightsailDefaultKey-eu-west-2.pem`
- **Deploy**: `./deploy.sh` — SSH into server, stops systemd service, force-resets to `origin/master`, runs `build-all-prod`, restarts service
- **Service**: `boatmanager` (systemd)

Always run `npm run build-all-prod` locally before deploying to catch build errors.

## Architecture

### Angular Frontend — State Machine Navigation

Navigation is driven by two transition maps in `app.component.ts`, not Angular Router guards. The `Next` / `Previous` buttons call `onNextClick()` / `onPreviousClick()`, which look up the next route in the active map and call `router.navigate()`.

**Check-out flow**: `check-in-or-out` → `boat-list` → `who-are-you` → `tell-us-why` → `check-out-complete`

**Check-in flow** (branches based on `AppState`):
- Default: `confirm-check-in` → `check-in-complete`
- `notTheOriginalUser`: `confirm-check-in` → `who-are-you` → `checkin-reason` → `check-in-complete`
- `problemsWithBoat`: `confirm-check-in` → `report-problem` → `check-in-complete`

**Shared state** (`src/app/app-state.ts`): `AppState` class holds `currentBoat`, `currentPerson`, `checkOutInProgress`, `notTheOriginalUser`, `problemsWithBoat`, `defects`, `engineHours`, etc. It is shared across all components via `StateService` (a `BehaviorSubject<AppState>`). Always call `state.reset()` when returning to the start.

**API calls**: All in `server.service.ts` using `HttpClient`. The `auth.interceptor.ts` attaches the Bearer JWT token to every outgoing request.

### Express Server

- **Entry point**: `server/src/server.ts`
- **Routes**: `server/src/routes/routes.ts` — registers all `/api/*` and `/admin/*` routes
- **API handlers**: `server/src/api/server.ts` (`ApiServer` class)
- **Admin handlers**: `server/src/controllers/adminController.ts`
- **Data access**: `server/src/model/dao.ts` — singleton `dao` that composes all manager classes
- **Admin UI**: EJS templates in `server/views/`, rendered with `res.render('index', ...)`

### Authentication — Two Separate Systems

**API (kiosk) auth**: RS256 JWT. `POST /api/login` with password `rowlocks` returns a Bearer token signed with `server/src/keys/private.key`. All `/api/*` routes (except `/api/version` and `/api/login`) verify the token using `server/src/keys/public.key`.

**Admin auth**: RS256 JWT stored in a cookie. Additionally, the token's user email must exist in `dao.tokenStore` (an in-memory `Map`) — logging out deletes the entry. Admin JWTs carry `{ isAdmin: true, user: AdminPerson }`.

### Data Access (`server/src/model/`)

All DynamoDB access goes through the `dao` singleton. It composes:
- `BoatManager` — boat CRUD, check-out/in state
- `PersonManager` — member lookup by surname initial + DOB
- `LogManager` — checkout/checkin log entries
- `DefectManager` — per-boat defect history (merges new reports with existing)
- `AdminPersonManager` — admin users
- `EngineHoursManager` — engine hour records per boat per use

`dao.checkInBoat()` orchestrates: merge defects, save engine hours, save boat state.

### Configuration

`server/config.json` (gitignored). Fields used at runtime:
- `checkout_reasons`, `checkin_reasons` — dropdown values in the UI
- `weekly_report_recipients` — email list for Monday 07:00 automated report
- SMTP settings — also loadable via `server/set-smtp-env.sh` for local dev

`Config.getInstance().get('key')` provides singleton access to config values.

### Email

`server/src/email/emailService.ts` — fault notification emails (sent on check-in with defects) and the weekly usage report. SMTP credentials come from env vars set by `server/set-smtp-env.sh`.

### Scheduled Tasks

`node-cron` in the server schedules the weekly report for Monday at 07:00. It can also be triggered manually via `GET /admin/weeklyReport` + `POST /admin/weeklyReport`.
