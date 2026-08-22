#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python -m json.tool "$ROOT/extension/manifest.json" >/dev/null
python -m py_compile "$ROOT/services/app/main.py"
for js in extension/background.js extension/content.js extension/popup/app.js extension/newtab/app.js extension/sidepanel/app.js; do node --check "$ROOT/$js"; done
for f in \
  extension/popup/index.html extension/popup/style.css \
  extension/newtab/index.html extension/newtab/style.css \
  extension/sidepanel/index.html extension/sidepanel/style.css \
  extension/icons/icon128.png services/Dockerfile services/requirements.txt \
  docker-compose.yml launcher/richmack-browser docs/SECURITY.md; do
  test -s "$ROOT/$f" || { echo "missing: $f"; exit 1; }
done
if grep -R --line-number -E 'shell[[:space:]]*=[[:space:]]*True|0\.0\.0\.0:8765:8765|/var/run/docker.sock|disable-component-update' "$ROOT" --exclude='smoke.sh'; then
  echo "unsafe pattern detected"
  exit 1
fi
echo "Richmack Browser v0.4.0 smoke: PASS"
