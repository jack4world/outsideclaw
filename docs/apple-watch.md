# Apple Watch integration (first milestone)

## Goal
Use Apple Watch as the **tracking device**, and outsideclaw (OpenClaw + Telegram) as the **assistant**.

## Reality check
- watchOS cannot run OpenClaw.
- The simplest reliable interface is **GPX export** (or sending the route file) from iPhone.

## Recommended workflow
1) Apple Watch records a hike (Workout)
2) Sync to iPhone
3) Export GPX (via a GPX-export app or your chosen workflow)
4) Send GPX to the Telegram bot/chat used by OpenClaw
5) outsideclaw imports → returns `routeId` and summary
6) During hike, send location (or live location) to get guidance

## Future (optional)
- iPhone companion app to provide higher-frequency location + offline fallback
- Haptic nudges on watch (requires native watch app; not in MVP)
