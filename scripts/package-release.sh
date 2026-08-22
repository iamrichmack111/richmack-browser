#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-$(cat "$ROOT/VERSION")}" 
VERSION="${VERSION#v}"
if [[ "$(cat "$ROOT/VERSION")" != "$VERSION" ]]; then
  echo "VERSION file does not match requested version: $VERSION" >&2
  exit 1
fi
OUT="$ROOT/dist"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
rm -rf "$OUT"
mkdir -p "$OUT"
FULL="richmack-browser-v$VERSION"
EXT="richmack-extension-suite-v$VERSION"
mkdir -p "$WORK/$FULL" "$WORK/$EXT/extensions"
for item in VERSION README.md install.sh uninstall.sh launcher assets platform extensions services docker-compose.yml docs data tests; do
  [[ -e "$ROOT/$item" ]] && cp -a "$ROOT/$item" "$WORK/$FULL/"
done
cp -a "$ROOT/extensions/." "$WORK/$EXT/extensions/"
find "$WORK" -type d -name __pycache__ -prune -exec rm -rf {} +
find "$WORK" -type f \( -name "*.pyc" -o -name ".DS_Store" \) -delete
cat > "$WORK/$EXT/README.md" <<EOT
# Richmack Extension Suite v$VERSION

This package contains the eight standalone Richmack Chromium toolbar extensions.

Load them from Chromium's chrome://extensions page with Developer Mode enabled and **Load unpacked**.

The Media and Feed tools may use the optional Richmack Services backend at http://127.0.0.1:8765.
EOT
(
  cd "$WORK"
  zip -qr "$OUT/$FULL.zip" "$FULL"
  zip -qr "$OUT/$EXT.zip" "$EXT"
)
(
  cd "$OUT"
  shasum -a 256 "$FULL.zip" > "$FULL.sha256"
  shasum -a 256 "$EXT.zip" > "$EXT.sha256"
)
echo "Built release artifacts:"
ls -lh "$OUT"/*
