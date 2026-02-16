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

## Quick start (local)
1. Install OpenClaw (follow OpenClaw docs)
2. Configure Telegram channel for your OpenClaw instance
3. Install the skill(s) in `skills/`
4. In Telegram: send GPX/KML → `/use <routeId>` → send location → `/g`

## License
MIT
