# outsideclaw Quickstart

## Install prerequisites
- Node.js (v20+ recommended; v25 ok)
- OpenClaw (for Telegram-based interaction)

## Setup
```bash
cd outsideclaw
npm run setup
```

This initializes:
- SQLite DB at `~/.outsideclaw/outsideclaw.sqlite` (override via `OUTSIDECLAW_DB`)
- Route artifacts dir at `~/.outsideclaw/routes/` (override via `OUTSIDECLAW_ROUTES_DIR`)

## Import a route
### KML
```bash
npm run import:kml -- /path/to/route.kml
```

### GPX
```bash
npm run import:gpx -- /path/to/route.gpx
```

You will get a deterministic content-hash `routeId` like `r1_...`.

Artifacts are written to:
- `~/.outsideclaw/routes/<routeId>/route.geojson`
- `~/.outsideclaw/routes/<routeId>/routepack.json`

## Guide (offline-capable)
```bash
npm run guide -- <routeId> <lat> <lon> [lastIdx] --wx on --mode day_hike
```

## Share a route to another outsideclaw agent
Create a bundle:
```bash
npm run share:route -- <routeId>
```

Import a bundle:
```bash
npm run import:bundle -- /path/to/outsideclaw-route-<routeId>-*.tar.gz
```

## Telegram usage (high level)
- Send GPX/KML → import → get `routeId`
- `/use <routeId>`
- Send location → `/g`

(Full Telegram wiring will be added on top of these deterministic CLIs.)
