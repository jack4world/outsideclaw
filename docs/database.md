# Database

outsideclaw stores private route/track/session data in a local SQLite DB.

## Default path
- `~/.outsideclaw/outsideclaw.sqlite`

## Override
- `OUTSIDECLAW_DB=/path/to/outsideclaw.sqlite`

## Initialize
```bash
npm run db:init
npm run db:info
```

## Tables (MVP)
- `routes`: imported routes (RoutePack / simplified polyline)
- `tracks`: recorded tracks (optional; only if you enable recording)
- `sessions`: per-chat/per-hike session state (active route, lastIdx, etc.)

Note: we intentionally keep data local/private by default.
