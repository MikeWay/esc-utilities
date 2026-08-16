# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a monorepo for **ESC-Utilities**, deployed as the `exe-sc-tools` Lightsail container service.

| Path | Purpose |
|---|---|
| `mealstock/` | **mealstock** app |
| `scm-tools/` | **scm-tools** subproject (git subtree from `MikeWay/scm-tools`) |
| `boatmanager/` | **boatmanager** (RIB Manager) subproject (git subtree from `MikeWay/boatmanager`) |
| `nginx/` | Shared nginx reverse-proxy image |
| `postgres-s3/` | Shared postgres+S3-backup image |
| `deploy.sh` | Unified build + push + deploy script |
| `exe-sc-tools-deploy.json` | Lightsail deployment config — **gitignored**, keep locally |

All five images (nginx, mealstock, scm-tools, postgres, boatmanager) run as containers within the
same `exe-sc-tools` Lightsail container service and talk to each other over `localhost` — nginx
routes `/mealstock`, `/scm-tools/`, and `/ribmanager/` (plus the dedicated
`scm-tools.exe-sailing-club.org` and `ribmanager.exe-sailing-club.org` domains) to the other
containers. mealstock and scm-tools also carry their own legacy standalone `deploy.sh` scripts
(SSH/rsync to a systemd service) left over from before they were containerized here — those are
no longer how production deploys happen; `./deploy.sh` at the repo root is the only deploy path now.

### Deploying everything

```bash
./deploy.sh
```

Before building, `deploy.sh` triggers an immediate S3 backup of the live database and waits for
it to complete (up to 30 s). It then builds nginx, mealstock, scm-tools, postgres-s3, and
boatmanager images, pushes them to Lightsail, updates `exe-sc-tools-deploy.json` with the new
image tags, and triggers a single deployment.

### Pulling in scm-tools updates

```bash
git subtree pull --prefix=scm-tools https://github.com/MikeWay/scm-tools.git main --squash
```

### Pulling in boatmanager updates

```bash
git subtree pull --prefix=boatmanager https://github.com/MikeWay/boatmanager.git master --squash
```

## Subproject documentation

Each app keeps its own detailed docs in its own `CLAUDE.md`:
- `mealstock/CLAUDE.md` — commands, configuration, architecture, auth, admin panel, DB schema, S3 backup mechanism
- `scm-tools/CLAUDE.md` — build/run commands, architecture, routes, scraper modules, permissions
- `boatmanager/CLAUDE.md` — build commands, version system, deployment, architecture, auth, data access
