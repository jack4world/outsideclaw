# outsideclaw

An outdoor personal assistant built **on top of OpenClaw**.

Focus: hiking routes (GPX/KML import), Telegram-based interaction, offline-friendly guidance, and safety-first workflows.

## What it does (MVP)
- Import GPX/KML route files (user-provided)
- Bind a route to a chat
- Reply to location messages with **low-token** off-route guidance (2-line fixed schema)
- Optional: render route map PNG for sharing

## Non-goals / constraints (important)
- Do **not** bypass logins/captchas on external sites.
- External sites (e.g. 2bulu) are **discovery-only** unless the user manually logs in.
- Default to user-provided GPX/KML for reliability + privacy.

## Apple Watch (deployment note)
OpenClaw does not run on watchOS.

Apple Watch is treated as a **sensor + recorder**:
- Record workout/GPS on Apple Watch
- Sync to iPhone
- Export GPX (or share route file) via iPhone, then send to Telegram

outsideclaw (running with OpenClaw) handles:
- Parsing/RoutePack generation
- Off-route computations
- Telegram replies

See: `docs/apple-watch.md`

## Repo layout
- `skills/` OpenClaw skills used by outsideclaw (starting with `trail-nav-telegram`)
- `docs/` deployment + usage docs
- `openclaw/` sample configs

## Deploy / run

### 1) Local (CLI only)
```bash
git clone https://github.com/jack4world/outsideclaw.git
cd outsideclaw
npm run setup
# import routes
npm run import:kml -- /path/to/route.kml
npm run import:gpx -- /path/to/route.gpx
# guide
npm run guide -- <routeId> <lat> <lon> [lastIdx] --wx on --mode day_hike
```

### 2) Telegram (via OpenClaw)
outsideclaw uses OpenClaw as the message gateway / agent runtime.

High-level steps:
1. Install and run OpenClaw gateway on your machine/server.
2. Configure the Telegram channel for your OpenClaw instance (bot token, etc.).
3. Point OpenClaw to use the skill in this repo:
   - Example: `openclaw/config.example.json`
4. In Telegram, send routes (GPX/KML) and locations; the agent responds with low-token guidance.

Notes:
- We do **not** bypass external site logins/captchas.
- Data is local-first: DB defaults to `~/.outsideclaw/outsideclaw.sqlite`.

## Quick start
See: `docs/quickstart.md`

## OpenClaw integration
See: `docs/openclaw-integration.md` (one-click patch + restart)

## Next steps / roadmap
Short-term (next 1–2 weeks):
- **Telegram wiring**: `/share <routeId>` to send a route bundle; auto-import bundles when a `.tar.gz` is received.
- **Track logging via Telegram**: when session recording is on, location messages append to `track_points`.
- **Risk engine**: write more `risk_events` (time cutoff, low-water heuristic, repeated off-route) and expose simple summaries.
- **Route recommendation v2**: include weather sharp-change signals (WX) and time constraints (startAt/cutoff) into deterministic scoring.
- **Deployment docs**: improve “how to deploy outsideclaw” (local + OpenClaw+Telegram).
- **Official website**: publish a GitHub Pages site from `docs/` for promotion.

Mid-term:
- **Track export**: export a session track to GeoJSON/GPX for backup and sharing.
- **Apple Watch integration**: start with event-level health signals (fatigue/overload reminders) via iPhone sync; keep privacy-first.
- **Privacy controls**: explicit `/record on/off` + redaction/masking options for shared bundles.

## Contributing
Issues and PRs are welcome. Please keep changes:
- offline-first,
- deterministic-by-default,
- low-token in outputs,
- privacy/safety-first.

## License
MIT
