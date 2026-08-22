#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test "$(cat "$ROOT/VERSION")" = "0.5.4"
for ext in richmack-core richmack-extract richmack-images richmack-email richmack-media richmack-feed richmack-pick richmack-automate; do
  test -f "$ROOT/extensions/$ext/manifest.json"
  python3 -m json.tool "$ROOT/extensions/$ext/manifest.json" >/dev/null
  grep -q '"version": "0.5.4"' "$ROOT/extensions/$ext/manifest.json"
  test -f "$ROOT/extensions/$ext/icons/icon16.png"
done
grep -q 'chrome_url_overrides' "$ROOT/extensions/richmack-core/manifest.json"
grep -q -- '--force-dark-mode' "$ROOT/launcher/richmack-browser"
grep -q 'pinned_by_default' "$ROOT/launcher/richmack-browser"
grep -q 'optional_host_permissions' "$ROOT/extensions/richmack-automate/manifest.json"
grep -q 'RM_RECORD_START' "$ROOT/extensions/richmack-automate/content.js"
grep -q 'RM_RUN_WORKFLOW' "$ROOT/extensions/richmack-automate/content.js"
grep -q 'recording:' "$ROOT/extensions/richmack-automate/background.js"
grep -q 'state/picked' "$ROOT/services/app/main.py"
grep -q '127.0.0.1:8765' "$ROOT/docker-compose.yml"
! grep -R --include='*.js' -n 'eval(' "$ROOT/extensions" >/dev/null
! grep -R --include='*.json' -n 'unsafe-eval' "$ROOT/extensions" >/dev/null
for f in "$ROOT"/extensions/*/*.js "$ROOT"/extensions/*/popup/*.js "$ROOT"/extensions/*/reader/*.js "$ROOT"/extensions/*/newtab/*.js; do
  [ -f "$f" ] && node --check "$f" >/dev/null
done
python3 -m py_compile "$ROOT/services/app/main.py"
echo "Richmack Browser v0.5.4 smoke: PASS"
