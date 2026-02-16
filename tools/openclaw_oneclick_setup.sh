#!/usr/bin/env bash
set -euo pipefail

# One-click OpenClaw integration for outsideclaw (developer convenience)
# 1) Install/update outsideclaw into ~/.outsideclaw/app/outsideclaw
# 2) Patch OpenClaw config JSON to load the installed trail-nav-telegram skill
# 3) Optional restart
#
# Usage:
#   bash tools/openclaw_oneclick_setup.sh --config /path/to/openclaw.config.json --restart

RESTART=0
CONFIG_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG_PATH="$2"; shift 2 ;;
    --restart)
      RESTART=1; shift 1 ;;
    *)
      echo "Unknown arg: $1"; exit 2 ;;
  esac
done

if [[ -z "$CONFIG_PATH" ]]; then
  echo "Usage: bash tools/openclaw_oneclick_setup.sh --config /path/to/openclaw.config.json [--restart]";
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$REPO_DIR/tools/outsideclaw_setup.sh"
node "$REPO_DIR/tools/patch_openclaw_config.js" --config "$CONFIG_PATH"

if [[ "$RESTART" -eq 1 ]]; then
  if command -v openclaw >/dev/null 2>&1; then
    echo "[openclaw] restarting gateway..."
    openclaw gateway restart
  else
    echo "[openclaw] openclaw CLI not found; please restart gateway manually."
  fi
fi

echo "[oneclick] OK"
