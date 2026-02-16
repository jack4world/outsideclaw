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

## Quick start
See: `docs/quickstart.md`

## Next steps / roadmap
Short-term (next 1–2 weeks):
- **Telegram wiring**: `/share <routeId>` to send a route bundle; auto-import bundles when a `.tar.gz` is received.
- **Track logging via Telegram**: when session recording is on, location messages append to `track_points`.
- **Risk engine**: write more `risk_events` (time cutoff, low-water heuristic, repeated off-route) and expose simple summaries.
- **Route recommendation v2**: include weather sharp-change signals (WX) and time constraints (startAt/cutoff) into deterministic scoring.

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
