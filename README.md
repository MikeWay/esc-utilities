# ESC-Utilities

A monorepo of web apps for Exe Sailing Club, deployed together as the `exe-sc-tools` AWS
Lightsail container service behind a shared nginx reverse proxy.

## Projects

| Path | App | Purpose |
|---|---|---|
| `mealstock/` | Meal Stock Control | Real-time galley stock control (Node.js/TypeScript, WebSocket + PostgreSQL) |
| `scm-tools/` | SCM Tools | Dashboard and automation tools for the club's membership CRM (Playwright-driven scraper + Express API) |
| `boatmanager/` | Boat Manager (RIB Manager) | Boat check-out/check-in kiosk and admin system (Angular + Express, DynamoDB) |
| `nginx/` | — | Shared nginx reverse-proxy image routing requests to each app |
| `postgres-s3/` | — | PostgreSQL image with automatic S3 backup/restore, used by `mealstock` |

Each app subdirectory has its own `CLAUDE.md` with detailed setup, configuration, and
architecture notes:
- [`mealstock/CLAUDE.md`](mealstock/CLAUDE.md)
- [`scm-tools/CLAUDE.md`](scm-tools/CLAUDE.md)
- [`boatmanager/CLAUDE.md`](boatmanager/CLAUDE.md)

See the root [`CLAUDE.md`](CLAUDE.md) for full repository layout and deployment details.

## Deploying

```bash
./deploy.sh
```

This backs up the live database, builds all app images (mealstock, scm-tools, boatmanager,
nginx, postgres-s3), pushes them to Lightsail, and triggers a single deployment covering every
service.

## Development

Each app is developed independently — `cd` into its directory and follow its own `CLAUDE.md` for
install/build/run commands. There is no shared build step across apps; `deploy.sh` is the only
thing that touches them all at once.
