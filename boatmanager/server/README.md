# BoatManager — Node.js Server

The Express backend for BoatManager. It serves the built Angular app as static files, exposes a REST API for the Angular client, and provides a server-rendered admin interface.

---

## Tech Stack

- **Node.js** with **Express 4**
- **TypeScript 4.9** (compiled to `server/dist/`)
- **AWS SDK v3** — DynamoDB for all persistent data
- **JWT (RS256)** — RSA key pair for API authentication
- **EJS** — server-rendered admin views
- **Multer** — CSV file uploads for bulk user import
- **express-session** + cookie-parser — admin session management
- **Jest + Supertest** — unit and integration tests

---

## Project Structure

```
server/
├── src/
│   ├── server.ts               # Express app entry point (port 3000)
│   ├── api/
│   │   └── server.ts           # ApiServer — REST API handler methods
│   ├── controllers/
│   │   └── adminController.ts  # Admin interface controller
│   ├── routes/
│   │   └── routes.ts           # All route definitions + auth middleware
│   ├── model/
│   │   ├── dao.ts              # Data Access Object (singleton, all managers)
│   │   ├── Boat.ts             # Boat entity
│   │   ├── Person.ts           # Club member entity
│   │   ├── AdminPerson.ts      # Admin user entity
│   │   ├── defect.ts           # Defect and DefectType models
│   │   ├── EngineHours.ts      # Engine hours record
│   │   └── log.ts              # Audit log entry
│   ├── keys/
│   │   ├── private.key         # RSA private key (JWT signing)
│   │   └── public.key          # RSA public key (JWT verification)
│   └── environment/
│       ├── environment.ts      # Development — DynamoDB table names (*-Test)
│       └── environment.prod.ts # Production — DynamoDB table names
├── views/                      # EJS templates for admin pages
├── public/                     # Built Angular app (static files)
├── dist/                       # Compiled server TypeScript
├── tsconfig.json
├── tsconfig.prod.json
└── package.json
```

---

## API Routes (`/api/*`)

All API routes require a valid JWT Bearer token in the `Authorization` header.

| Method | Path | Description |
|---|---|---|
| GET | `/api/version` | Returns current server version (no auth required) |
| POST | `/api/login` | Authenticate and receive a JWT token |
| POST | `/api/check-person` | Look up a member by surname initial + date of birth |
| GET | `/api/available-boats` | List boats not currently checked out |
| GET | `/api/checked-out-boats` | List currently checked-out boats |
| POST | `/api/check-out-boat` | Check out a boat (records user, reason, timestamp) |
| POST | `/api/check-in-boat` | Check in a boat (records defects, engine hours) |
| GET | `/api/defects-list` | List known defect types |
| GET | `/api/checkin-reasons` | List available check-in reasons |

### Login

```http
POST /api/login
Content-Type: application/json

{ "password": "<password>" }
```

Returns `{ "token": "<JWT>" }`. The JWT is RS256-signed and has no expiry.

### Check Person

```http
POST /api/check-person
Authorization: Bearer <token>
Content-Type: application/json

{
  "familyInitial": "S",
  "day": 15,
  "month": 6,
  "year": 1990   // optional
}
```

Returns an array of matching `Person` objects.

### Check Out Boat

```http
POST /api/check-out-boat
Authorization: Bearer <token>
Content-Type: application/json

{
  "boat": { ...Boat },
  "user": { ...Person },
  "reason": "Club race"
}
```

### Check In Boat

```http
POST /api/check-in-boat
Authorization: Bearer <token>
Content-Type: application/json

{
  "boat": { ...Boat },
  "user": { ...Person },
  "problems": [ { "defectType": { "name": "..." }, "additionalInfo": "..." } ],
  "engineHours": 2.5
}
```

---

## Admin Routes (`/admin/*`)

Admin routes require a valid JWT stored in the `jwt` cookie, issued at admin login. The JWT payload must include `isAdmin: true` and the user's email must exist in the server-side token store.

| Method | Path | Description |
|---|---|---|
| GET | `/admin-login` | Admin login page |
| POST | `/admin/login` | Submit admin credentials |
| GET | `/admin/logout` | Invalidate admin session |
| GET | `/admin` | Admin home |
| GET | `/admin/listUsers` | List all club members |
| GET | `/admin/loadUsers` | Form to upload new members |
| POST | `/admin/upload-users` | Upload members from CSV file |
| GET | `/admin/deleteAllUsers` | Delete all member records |
| GET | `/admin/set-password` | Change admin API password |
| POST | `/admin/set-password` | Submit new admin API password |
| GET | `/admin/add-admin-user` | Add a new admin user |
| POST | `/admin/add-admin-user` | Save new admin user |
| POST | `/admin/delete-user` | Delete an admin user |
| POST | `/admin/checkInAll` | Force check-in all boats |
| GET | `/admin/boatsWithIssues` | Report: boats with unresolved defects |
| GET | `/admin/boatsCheckedOut` | Report: currently checked-out boats |
| GET | `/admin/defectsForBoat/:boatId` | Report: defect history for a boat |
| GET | `/admin/engineHours` | Report: engine hours summary |
| GET | `/admin/engineHoursForBoat/:boatId` | Report: engine hours for a specific boat |
| GET | `/admin/engineHoursByUse` | Report: engine hours grouped by use type |
| GET | `/admin/engineHoursByUseByBoat` | Report: engine hours by use type per boat |
| POST | `/admin/checkIfDefectToBeCleared` | Mark a defect for clearing |
| POST | `/admin/confirmDefectCleared` | Confirm a defect has been resolved |
| POST | `/admin/clearAllBoatFaults` | Clear all faults for a boat |
| GET | `/admin/trialUploadUsers` | Form to trial-upload members (no data changed) |
| POST | `/admin/trial-upload-users` | Run trial upload, show before/after report |
| GET | `/admin/findMembers` | Find members by surname initial |
| POST | `/admin/findMembers` | Search and display matching members |
| GET | `/admin/weeklyReport` | Form to send the weekly report |
| POST | `/admin/weeklyReport` | Send weekly report to specified recipients |
| GET | `/admin/developerOptions` | Developer options page |
| GET | `/admin/report` | Download full audit log as CSV |

---

## Authentication

### API Authentication (JWT Bearer)

1. Client calls `POST /api/login` with the shared password.
2. Server validates the password and returns an RS256-signed JWT.
3. Client includes the token as `Authorization: Bearer <token>` on all subsequent API calls.
4. Server verifies the token using `server/src/keys/public.key`.

### Admin Authentication (Cookie-based JWT)

1. Admin submits credentials to `POST /admin/login`.
2. Server validates against the `Admin_Persons` DynamoDB table (bcrypt password hash).
3. On success, a JWT containing `{ isAdmin: true, user: AdminPerson }` is set as the `jwt` cookie, and the user's email is added to an in-memory token store.
4. Subsequent admin requests verify the cookie JWT and check the token store (logout invalidates the store entry).

---

## Data Layer

All database access goes through the `dao` singleton (`src/model/dao.ts`), which exposes manager classes:

| Manager | Responsibility |
|---|---|
| `BoatManager` | Boat CRUD, check-out / check-in state |
| `PersonManager` | Member lookup by surname initial + DOB; list all members by surname initial |
| `LogManager` | Append-only audit log of all check-in/out events |
| `DefectManager` | Defect records per boat |
| `EngineHoursManager` | Engine hours records per check-in |
| `AdminPersonManager` | Admin user management (bcrypt passwords) |

### DynamoDB Tables

| Table name (production) | Purpose |
|---|---|
| `Boats` | Boat records and current status |
| `Boat_Users` | Club member records |
| `BoatDefects` | Reported defects |
| `EngineHours` | Engine hours per check-in event |
| `Rib_Logs` | Full audit log |
| `Admin_Persons` | Admin user credentials |

Development uses tables with a `-Test` suffix (e.g. `Boats-Test`).

AWS region: **eu-west-1** (Ireland).

---

## Configuration

### Environment files

- `src/environment/environment.ts` — development (test table names)
- `src/environment/environment.prod.ts` — production (live table names)

The production build uses `tsconfig.prod.json` which path-maps `environment.ts` to `environment.prod.ts`.

### RSA Keys

Place the RSA key pair in `server/src/keys/`:

```
server/src/keys/
├── private.key   # Used to sign JWTs
└── public.key    # Used to verify JWTs
```

These files are copied into `server/dist/keys/` during the build. They are `.gitignore`d and must be provisioned separately on each environment.

---

## Development

### Install and build

```bash
cd server
npm install
npm run build          # development build
npm run build:prod     # production build
```

### Run the server

```bash
npm start              # runs compiled server/dist/server.js
```

Server listens on **port 3000**.

### Unit tests

```bash
npm test
```

---

## Deployment

Production runs on **AWS Lightsail** (`bitnami@ribmanager.exe-sailing-club.org`, eu-west-2) as a **systemd** service (`boatmanager.service`).

```bash
# From project root
./deploy.sh        # builds everything and deploys to production (also: npm run deploy)
```

The deploy script:
1. SSHes to the Lightsail instance using `~/.ssh/LightsailDefaultKey-eu-west-2.pem`
2. Pulls the latest code from `origin/master`
3. Runs `npm run build-all-prod` (Angular + server TypeScript)
4. Restarts the `boatmanager.service` systemd unit

Apache2 is configured as a reverse proxy, forwarding public HTTPS traffic to `localhost:3000`.
