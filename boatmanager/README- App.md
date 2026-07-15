# BoatManager — Angular Frontend

The Angular 20 client application for BoatManager. It provides a mobile-friendly web interface for club members to check boats in and out, report defects, and record engine hours.

---

## Tech Stack

- **Angular 20** with standalone components
- **Angular Material 20** (azure-blue theme) for UI components
- **TypeScript 5.8**
- **RxJS 7.8** for reactive data streams
- **Moment.js** for date/time formatting
- **Karma + Jasmine** for unit tests
- **Playwright** for end-to-end tests

---

## Application Structure

```
src/app/
├── app.component.ts            # Root component
├── app.config.ts               # Angular providers (HTTP, router, etc.)
├── app.routes.ts               # Route definitions
├── app-state.ts                # Shared application state model
│
├── Services
│   ├── server.service.ts       # HTTP calls to the backend API
│   ├── state-service.ts        # Client-side state management
│   ├── auth.service.ts         # Authentication (login, token storage)
│   └── auth.interceptor.ts     # Attaches JWT Bearer token to requests
│
└── Components (one directory per route)
    ├── home/                   # Entry redirect
    ├── login/                  # User login screen
    ├── check-in-or-out/        # Initial choice: check in or check out?
    ├── boat-list/              # List of available / checked-out boats
    ├── who-are-you/            # Collect user identity (name initial + DOB)
    ├── tell-us-why/            # Capture reason for check-out
    ├── check-out-complete/     # Check-out confirmation screen
    ├── confirm-check-in/       # Confirm the user checking in owns the boat
    ├── report-problem/         # Report defects / issues with the boat
    └── check-in-complete/      # Check-in confirmation screen
```

---

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `CheckInOrOutComponent` | Home — choose check in or check out |
| `/login` | `LoginComponent` | Obtain a JWT token |
| `/check-in-or-out` | `CheckInOrOutComponent` | Same as home |
| `/boat-list` | `BoatListComponent` | Browse available or checked-out boats |
| `/who-are-you` | `WhoAreYouComponent` | Enter name initial and date of birth |
| `/tell-us-why` | `TellUsWhyComponent` | Enter reason for check-out |
| `/check-out-complete` | `CheckOutCompleteComponent` | Check-out success screen |
| `/confirm-check-in` | `ConfirmCheckInComponent` | Confirm ownership before check-in |
| `/report-problem` | `ReportProblemComponent` | Report defects / issues |
| `/check-in-complete` | `CheckInCompleteComponent` | Check-in success screen |
| `**` | — | Redirect to `/` |

---

## User Flows

### Check-Out Flow

```
Check In or Out?
  └─► Select "Check Out"
        └─► Who Are You?  (name initial + date of birth → match against member list)
              └─► Select a Boat  (from available boats list)
                    └─► Tell Us Why  (reason for taking the boat)
                          └─► Check-Out Complete
```

### Check-In Flow

```
Check In or Out?
  └─► Select "Check In"
        └─► Select a Boat  (from checked-out boats list)
              └─► Confirm Check-In  (did YOU check this boat out?)
                    ├─ Yes ──► Report Problem?  (optional defect report + engine hours)
                    │               └─► Check-In Complete
                    └─ No ──► Who Are You?  (identify the person checking it in)
                                    └─► Report Problem?
                                              └─► Check-In Complete
```

---

## Services

### `ServerService`

Handles all HTTP communication with the backend. All calls attach the JWT via `AuthInterceptor`.

| Method | HTTP | Endpoint | Description |
|---|---|---|---|
| `login()` | POST | `/api/login` | Authenticate and retrieve JWT |
| `checkPerson()` | POST | `/api/check-person` | Look up a member by name initial + DOB |
| `getAvailableBoats()` | GET | `/api/available-boats` | List boats not currently checked out |
| `getCheckedOutBoats()` | GET | `/api/checked-out-boats` | List currently checked-out boats |
| `checkoutBoat()` | POST | `/api/check-out-boat` | Check out a boat |
| `checkInBoat()` | POST | `/api/check-in-boat` | Check in a boat with defects + engine hours |
| `getPossibleDefectsList()` | GET | `/api/defects-list` | Retrieve the list of known defect types |

### `StateService`

Holds transient application state (selected boat, identified user, reported defects, engine hours) that is shared across the multi-step check-in/check-out wizard.

### `AuthService` + `AuthInterceptor`

`AuthService` stores the JWT token obtained at login. `AuthInterceptor` automatically adds the `Authorization: Bearer <token>` header to every outgoing HTTP request.

---

## Development

### Dev server

```bash
npm start
# Navigate to http://localhost:4200/
```

The app expects the backend API to be available. For local development, configure the API URL in the environment files or run the backend server in parallel.

### Unit tests

```bash
npm test
# or with coverage
ng test --code-coverage
```

### End-to-end tests

```bash
npm run e2e        # headless
npm run e2eui      # with Playwright UI
npm run gentest    # record new tests against http://localhost:4200
```

### Build

```bash
ng build           # development build → server/public/
ng build --configuration production  # production build
```

The build output goes to `server/public/` and is served directly by the Express backend.

---

## Build Budgets (production)

| Type | Warning | Error |
|---|---|---|
| Initial bundle | 500 kB | 1 MB |
| Component styles | 2 kB | 4 kB |
