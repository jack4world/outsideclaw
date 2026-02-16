# OpenClaw integration (one-click)

outsideclaw can be used with OpenClaw as the Telegram gateway / agent runtime.

## Recommended (one-click)
Use the **trail-nav-telegram** skill (published on ClawHub) which includes a one-click installer.

If you prefer using the scripts in this repo directly:

```bash
bash tools/openclaw_oneclick_setup.sh --config /path/to/openclaw.config.json --restart
```

What it does:
1) Installs/updates outsideclaw to `~/.outsideclaw/app/outsideclaw`
2) Patches your OpenClaw config JSON (creates `*.bak`)
3) Optionally restarts OpenClaw gateway

## Notes
- Default DB: `~/.outsideclaw/outsideclaw.sqlite`
- Default route artifacts: `~/.outsideclaw/routes/<routeId>/...`
- We do not bypass external site logins/captchas.
