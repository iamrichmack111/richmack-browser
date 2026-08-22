#!/usr/bin/env bash
set -euo pipefail
OS="$(uname -s)"
if [ "$OS" = "Darwin" ]; then
  rm -rf "$HOME/Applications/Richmack Browser.app"
  rm -f "$HOME/Desktop/Richmack Browser.app"
  rm -rf "$HOME/Library/Application Support/Richmack Browser"
else
  rm -f "$HOME/.local/share/applications/richmack-browser.desktop"
  rm -f "$HOME/Desktop/Richmack Browser.desktop"
  rm -rf "$HOME/.local/share/richmack-browser"
fi
if command -v docker >/dev/null 2>&1; then docker rm -f richmack-browser-services >/dev/null 2>&1 || true; fi
echo "Richmack Browser application files removed."
echo "Your browser profile remains at ~/.richmack/browser-profile-v054 unless you remove it manually."
