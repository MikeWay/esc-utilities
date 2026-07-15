# BoatManager

A full-stack web application for managing boat check-ins and check-outs at Exe Sailing Club. The system tracks boat availability, records who has taken each boat and why, logs engine hours, and captures defect reports.

**Production URL:** https://ribmanager.exe-sailing-club.org/

---

## Architecture

```
BoatManager/
├── src/                  # Angular 20 frontend (client)
├── server/               # Node.js/Express backend
│   ├── src/              # TypeScript source
│   ├── public/           # Built Angular app (served as static files)
│   ├── views/            # EJS templates (admin interface)
│   └── dist/             # Compiled server code
├── tests/                # Playwright end-to-end tests
└── boatmanager.service   # systemd service definition
```

The Angular app is built into `server/public/` and served by the Express server as static files. The Express server also exposes a REST API (`/api/*`) and a server-rendered admin interface (`/admin/*`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20, Angular Material (azure-blue theme), TypeScript |
| Backend | Node.js, Express 4, TypeScript |
| Database | AWS DynamoDB (6 tables, eu-west-1) |
| Auth (API) | JWT RS256 (RSA key pair) |
| Auth (Admin) | JWT in cookie + server-side token store |
| Process manager | systemd |
| Reverse proxy | Apache2 → port 3000 |
| Unit tests | Karma/Jasmine (frontend), Jest (backend) |
| E2E tests | Playwright |

---

## Quick Start (Development)

### Prerequisites

- Node.js (LTS)
- AWS credentials configured with access to the DynamoDB tables
- RSA key pair in `server/src/keys/` (`private.key`, `public.key`)

### Install and build everything

```bash
npm run build-all
```

This installs dependencies and builds both the Angular app and the server.

### Run the backend server

```bash
npm run start-server
```

The server listens on **port 3000**. The Angular app is served from `server/public/`.

### Run the Angular dev server (frontend only)

```bash
npm start
```

Navigate to `http://localhost:4200/`. The app will reload automatically on file changes.

---

## Build Commands

| Command | Description |
|---|---|
| `npm run build-all` | Install deps + build frontend + build server (development) |
| `npm run build-all-prod` | Install deps + build frontend + build server (production, optimised) |
| `npm run build` | Build Angular app only |
| `npm run build-server` | Build Node.js server only |
| `npm run build-server-prod` | Build Node.js server with production config |
| `npm run start-server` | Install server deps and start the server |
| `npm test` | Run Angular unit tests |
| `npm run e2e` | Run Playwright end-to-end tests |

---

## Deployment

The server runs as a Node.js process managed by **systemd**, behind an **Apache2** reverse proxy.

### First-time setup

After cloning, create the SMTP credentials file from the example template:

```bash
cp server/set-smtp-env.sh.example server/set-smtp-env.sh
# Edit server/set-smtp-env.sh and fill in the real SMTP credentials
```

`server/set-smtp-env.sh` is gitignored — it will never be overwritten by `git pull`.
Do **not** delete or recreate it during updates.

#### Install the systemd service (once only)

```bash
# Copy the service file and enable it to start on boot
sudo cp ~/BoatManager/boatmanager.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable boatmanager
sudo systemctl start boatmanager

# Check it's running
sudo systemctl status boatmanager
```

After this, the server will start automatically on boot and restart on crash.
Use `sudo systemctl start/stop/restart/status boatmanager` to manage it.

### Update procedure

```bash
# 1. SSH into the server
# 2. Navigate to the project directory
cd BoatManager

# 3. Stop the running server
sudo systemctl stop boatmanager

# 4. Pull latest code (set-smtp-env.sh is gitignored and will not be affected)
git pull

# 5. Build everything for production
npm run build-all-prod

# 6. Start the server
sudo systemctl start boatmanager

# 7. Verify at https://ribmanager.exe-sailing-club.org/
```

---

## Further Documentation

- **Frontend (Angular app):** [README- App.md](./README-%20App.md)
- **Backend (Node.js server):** [server/README.md](./server/README.md)
