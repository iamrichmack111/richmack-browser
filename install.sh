#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$HOME/Downloads/Richmack" "$HOME/.richmack"

echo "[1/3] Richmack directories ready"
if curl -fsS --max-time 1 http://127.0.0.1:8765/health >/dev/null 2>&1; then
  echo "[2/3] Existing Richmack backend is already healthy on 127.0.0.1:8765; reusing it"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  (cd "$ROOT" && docker compose up -d --build)
  echo "[2/3] Local Richmack service started on 127.0.0.1:8765"
else
  echo "[2/3] Docker not found; browser still works without media/document backend"
fi

echo "[3/3] Launching Richmack Browser profile"
exec "$ROOT/launcher/richmack-browser"
