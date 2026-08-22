#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$HOME/.richmack" "$HOME/Downloads/Richmack"

echo "[1/5] Richmack Browser OS v0.5.5"
if [ ! -x /Applications/Chromium.app/Contents/MacOS/Chromium ]; then
  echo "Chromium was not found. Install it first:"
  echo "  brew install --cask chromium"
  exit 1
fi

echo "[2/5] Checking local Richmack service"
HEALTH="$(curl -fsS --max-time 1 http://127.0.0.1:8765/health 2>/dev/null || true)"
if printf '%s' "$HEALTH" | grep -q '"suite":"0.5.5"'; then
  echo "      Backend already ready"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "      Updating Richmack backend"
  OLD="$(docker ps --filter 'publish=8765' --format '{{.ID}}' | head -1)"
  [ -z "$OLD" ] || docker rm -f "$OLD" >/dev/null 2>&1 || true
  (cd "$ROOT" && docker compose up -d --build)
  for _ in {1..20}; do
    sleep .5
    curl -fsS --max-time 1 http://127.0.0.1:8765/health >/dev/null 2>&1 && break
  done
  echo "      Backend ready on 127.0.0.1:8765"
else
  echo "      Docker not found. Core/browser tools work; media/generated RSS stay offline."
fi

echo "[3/5] Richmack dark mode configured"
echo "      Chromium UI: dark · Richmack pages/popups: dark"

echo "[4/5] Eight individual toolbar tools prepared"
echo "      Core · Extract · Images · Email · Media · Feed · Pick · Automate"
echo "      Fresh v0.5.5 profiles request Chromium's 'pin new extensions' preference."

echo "[5/5] Launching dedicated Richmack Chromium profile"
echo
exec "$ROOT/launcher/richmack-browser"
