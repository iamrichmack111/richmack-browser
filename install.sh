#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$HOME/Downloads/Richmack" "$HOME/.richmack"

echo "[1/3] Richmack directories ready"
HEALTH="$(curl -fsS --max-time 1 http://127.0.0.1:8765/health 2>/dev/null || true)"
if printf '%s' "$HEALTH" | grep -q '"feeds":true'; then
  echo "[2/3] Richmack v0.4 backend is already healthy on 127.0.0.1:8765"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  if [ -n "$HEALTH" ]; then
    echo "[2/3] Older Richmack backend detected; replacing it for v0.4 feed support"
    docker rm -f richmack-browser-services >/dev/null 2>&1 || true
    # Also stop a previous richmack compose container if it owns port 8765.
    OLD_ID="$(docker ps --filter 'publish=8765' --filter 'name=richmack' --format '{{.ID}}' | head -1)"
    [ -z "$OLD_ID" ] || docker rm -f "$OLD_ID" >/dev/null 2>&1 || true
  fi
  (cd "$ROOT" && docker compose up -d --build)
  echo "[2/3] Richmack v0.4 service started on 127.0.0.1:8765"
else
  echo "[2/3] Docker not found; browser works, but media/generated RSS backend features stay offline"
fi

echo "[3/3] Launching Richmack Browser profile"
exec "$ROOT/launcher/richmack-browser"
