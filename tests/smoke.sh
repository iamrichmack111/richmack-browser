#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test "$(cat "$ROOT/VERSION")" = "0.5.2"
for ext in richmack-core richmack-extract richmack-images richmack-email richmack-media richmack-feed richmack-pick richmack-automate; do
  test -f "$ROOT/extensions/$ext/manifest.json"
  python3 -m json.tool "$ROOT/extensions/$ext/manifest.json" >/dev/null
  test -f "$ROOT/extensions/$ext/icons/icon16.png"
done
grep -q 'chrome_url_overrides' "$ROOT/extensions/richmack-core/manifest.json"
grep -q 'state/picked' "$ROOT/services/app/main.py"
grep -q '127.0.0.1:8765' "$ROOT/docker-compose.yml"
! grep -R --include='*.js' -n 'eval(' "$ROOT/extensions" >/dev/null
! grep -R --include='*.json' -n 'unsafe-eval' "$ROOT/extensions" >/dev/null
node --check "$ROOT/extensions/richmack-feed/content.js" >/dev/null
node --check "$ROOT/extensions/richmack-feed/popup/app.js" >/dev/null
grep -q 'viewjob?jk=' "$ROOT/extensions/richmack-feed/content.js"
grep -q 'page_type' "$ROOT/services/app/main.py"
python3 -m py_compile "$ROOT/services/app/main.py"
echo "Richmack Browser v0.5.2 smoke: PASS"
