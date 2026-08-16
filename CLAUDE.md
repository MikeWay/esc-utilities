# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a monorepo for the `exe-sc-tools` Lightsail container service.

| Path | Purpose |
|---|---|
| `mealstock/` | **mealstock** app |
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

## Subproject documentation

Each app keeps its own detailed docs in its own `CLAUDE.md`:
- `mealstock/CLAUDE.md` — commands, configuration, architecture, auth, admin panel, DB schema, S3 backup mechanism
- `scm-tools/CLAUDE.md`
- `boatmanager/CLAUDE.md`
