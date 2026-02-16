---
name: trail-nav-telegram
description: "Offline-capable hiking route guidance via Telegram location messages (OpenClaw). Use when building/operating an LLM agent workflow that: (1) imports a GPX/KML route, (2) answers 'am I off-route / which way should I go' with low-token fixed outputs, (3) scrapes/publicly discovers route links from 2bulu track_search, and (4) prepares trip risk checklists + gear lists for an overnight hike."
---

# Trail Nav via Telegram (low-token)

## Goals
- Use Telegram (iOS) as the UI: user sends **location** + short commands.
- Keep token usage minimal: do **all geometry calculations deterministically**, use LLM only for optional wording.
- Respect access controls: **do not bypass logins/captchas** on external sites.

## Quick workflow
1) **Import route** (GPX/KML) → build a compact RoutePack (simplified polyline + bbox + endpoints).
2) **Bind** route to the chat (`/use <routeId>`).
3) **Guide**: user sends location (or `/g` + location) → reply with 2-line output (machine line + Chinese template).

## Token-saving rules (hard)
- Never send full KML/GPX text into the LLM context.
- Parse route once; store `routeId` + simplified points.
- Output is fixed schema (see references/guide-protocol.md).
- Cache per-chat state: `activeRouteId`, `lastIdx`.

## External discovery (2bulu)
Two supported modes:

1) **Public discovery (no login)**
- Only scrape **public list/search pages** (e.g. `/track/track_search.htm`, `/track/search-<keyword>.htm`).
- Store: title + url + scraped_at.

2) **Manual-login assist (optional)**
- If the user manually logs in (WeChat/QQ/etc.) in a persistent browser profile, automation may proceed **within that same profile**.
- Login/captcha steps must be completed by the user. Do **not** bypass access controls.

Preferred alternative (often simplest): ask the user to export/send the **GPX/KML file via Telegram**; then operate purely on the user-provided route file.

## Safety reminders
- Provide explicit **no-signal** / SOS guidance. See references/safety-checklist.md.
- Encourage “hard cutoffs” for overnight hikes (time, wind/fog, hydration).

## Bundled resources
- Scripts:
  - `scripts/scrape_2bulu_tracks.js` list-page scraper → JSON/CSV + screenshot
  - `scripts/parse_2bulu_kml.js` parse KML → stats + geojson + routepack
  - `scripts/render_route_map.js` render route HTML+PNG map for sharing
- References:
  - `references/2bulu-notes.md`
  - `references/guide-protocol.md`
  - `references/safety-checklist.md`
  - `references/gear-list-overnight.md`
