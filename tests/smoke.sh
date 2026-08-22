#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test "$(cat "$ROOT/VERSION")" = "0.6.0"
for ext in richmack-core richmack-extract richmack-images richmack-email richmack-media richmack-feed richmack-pick richmack-automate; do
  test -f "$ROOT/extensions/$ext/manifest.json"
  grep -q '"version": "0.6.0"' "$ROOT/extensions/$ext/manifest.json"
done
test -x "$ROOT/install.sh"
test -x "$ROOT/uninstall.sh"
test -x "$ROOT/launcher/richmack-browser"
test -f "$ROOT/assets/RichmackBrowser.icns"
test -f "$ROOT/assets/richmack-browser-256.png"
test -f "$ROOT/platform/macos/Info.plist"
test -f "$ROOT/platform/linux/richmack-browser.desktop.in"
grep -q 'Darwin' "$ROOT/install.sh"
grep -q 'ubuntu' "$ROOT/install.sh"
grep -q 'Richmack Browser.app' "$ROOT/install.sh"
grep -q 'richmack-browser.desktop' "$ROOT/install.sh"
python3 -m py_compile "$ROOT/services/app/main.py"
for f in "$ROOT"/extensions/*/*.js "$ROOT"/extensions/*/*/*.js; do [ -f "$f" ] || continue; node --check "$f" >/dev/null; done
echo "Richmack Browser v0.6.0 smoke: PASS"
