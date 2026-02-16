# outsideclaw

Outdoor personal assistant built on top of **OpenClaw**.

## Why
- Offline-first guidance to reduce getting lost
- Deterministic-by-default (LLM used only when it helps)
- Privacy-first: data stays local unless you explicitly share

## Core features
- Import routes: GPX/KML → stable `routeId`
- Guide: low-token off-route corrections + key-node alerts + weather sharp-change alerts
- Route artifacts: `~/.outsideclaw/routes/<routeId>/...`
- Local DB: `~/.outsideclaw/outsideclaw.sqlite`
- Share bundles: portable `.tar.gz` route bundles between outsideclaw agents

## Quickstart
See the repo docs:
- `docs/quickstart.md`

## Repo
<https://github.com/jack4world/outsideclaw>

## Principles
- Safety-first
- Deterministic-by-default
- Low-token outputs
- No bypassing logins/captchas
