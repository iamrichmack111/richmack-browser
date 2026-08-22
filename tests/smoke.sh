#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test "$(cat "$ROOT/VERSION")" = "0.5.5"
for ext in richmack-core richmack-extract richmack-images richmack-email richmack-media richmack-feed richmack-pick richmack-automate; do
  test -f "$ROOT/extensions/$ext/manifest.json"
  grep -q '"version": "0.5.5"' "$ROOT/extensions/$ext/manifest.json"
done
grep -q 'RM_BULK_RUN' "$ROOT/extensions/richmack-automate/content.js"
grep -q 'Max per run' "$ROOT/extensions/richmack-automate/popup/index.html"
grep -q 'Delay ms' "$ROOT/extensions/richmack-automate/popup/index.html"
grep -q 'profile-v054' "$ROOT/launcher/richmack-browser"
grep -q -- '--force-dark-mode' "$ROOT/launcher/richmack-browser"
python3 -m py_compile "$ROOT/services/app/main.py"
python3 - <<PY
import json, pathlib
root=pathlib.Path('$ROOT')
for p in (root/'extensions').glob('*/manifest.json'):
    json.load(open(p))
print('manifest json: PASS')
PY
echo "Richmack Browser v0.5.5 smoke: PASS"
