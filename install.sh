#!/usr/bin/env bash
set -euo pipefail
SRC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="$(cat "$SRC_ROOT/VERSION")"
OS="$(uname -s)"

case "$OS" in
  Darwin)
    PLATFORM="macos"
    INSTALL_ROOT="$HOME/Library/Application Support/Richmack Browser"
    ;;
  Linux)
    if [ -f /etc/os-release ]; then . /etc/os-release; else ID=linux; fi
    if [ "${ID:-}" != "ubuntu" ] && [ "${ID_LIKE:-}" != *ubuntu* ] && [ "${ID_LIKE:-}" != *debian* ]; then
      echo "Richmack Browser currently supports macOS and Ubuntu/Debian Linux."
      exit 1
    fi
    PLATFORM="ubuntu"
    INSTALL_ROOT="$HOME/.local/share/richmack-browser"
    ;;
  *)
    echo "Unsupported OS: $OS. Supported: macOS and Ubuntu/Debian Linux."
    exit 1
    ;;
esac

echo "Richmack Browser OS v$VERSION"
echo "Detected: $PLATFORM"
echo "Installing to: $INSTALL_ROOT"
mkdir -p "$INSTALL_ROOT" "$HOME/.richmack" "$HOME/Downloads/Richmack"

# Copy the package to a persistent location so Desktop launchers keep working after Downloads is cleaned.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude '.git' --exclude 'dist' "$SRC_ROOT/" "$INSTALL_ROOT/"
else
  rm -rf "$INSTALL_ROOT/extensions" "$INSTALL_ROOT/services" "$INSTALL_ROOT/launcher" "$INSTALL_ROOT/assets" "$INSTALL_ROOT/docs" "$INSTALL_ROOT/platform" "$INSTALL_ROOT/tests"
  cp -R "$SRC_ROOT/extensions" "$SRC_ROOT/services" "$SRC_ROOT/launcher" "$SRC_ROOT/assets" "$SRC_ROOT/docs" "$SRC_ROOT/platform" "$SRC_ROOT/tests" "$INSTALL_ROOT/"
  cp "$SRC_ROOT/docker-compose.yml" "$SRC_ROOT/VERSION" "$INSTALL_ROOT/"
fi
chmod +x "$INSTALL_ROOT/launcher/richmack-browser"

# Chromium check with clear per-platform install path.
if [ "$PLATFORM" = "macos" ]; then
  if [ ! -x /Applications/Chromium.app/Contents/MacOS/Chromium ] && [ ! -x "$HOME/Applications/Chromium.app/Contents/MacOS/Chromium" ]; then
    if command -v brew >/dev/null 2>&1; then
      echo "Chromium is missing. Installing with Homebrew..."
      brew install --cask chromium
    else
      echo "Chromium is missing. Install Homebrew, then: brew install --cask chromium"
      exit 1
    fi
  fi
else
  if ! command -v chromium >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1; then
    if command -v snap >/dev/null 2>&1; then
      echo "Chromium is missing. Installing with snap (sudo may prompt)..."
      sudo snap install chromium
    else
      echo "Chromium is missing. On Ubuntu install it with: sudo snap install chromium"
      exit 1
    fi
  fi
fi

# Backend is optional; browser/extension tools still work without Docker.
HEALTH="$(curl -fsS --max-time 1 http://127.0.0.1:8765/health 2>/dev/null || true)"
if printf '%s' "$HEALTH" | grep -q '"suite":"0.6.0"'; then
  echo "Backend: already ready"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "Backend: starting/updating local service"
  OLD="$(docker ps --filter 'publish=8765' --format '{{.ID}}' | head -1)"
  [ -z "$OLD" ] || docker rm -f "$OLD" >/dev/null 2>&1 || true
  (cd "$INSTALL_ROOT" && docker compose up -d --build)
else
  echo "Backend: Docker not found; media and generated RSS backend features remain offline."
fi

if [ "$PLATFORM" = "macos" ]; then
  APP="$HOME/Applications/Richmack Browser.app"
  mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$HOME/Applications"
  cp "$INSTALL_ROOT/platform/macos/Info.plist" "$APP/Contents/Info.plist"
  cp "$INSTALL_ROOT/assets/RichmackBrowser.icns" "$APP/Contents/Resources/RichmackBrowser.icns"
  cat > "$APP/Contents/MacOS/richmack-browser" <<APP
#!/usr/bin/env bash
exec "$INSTALL_ROOT/launcher/richmack-browser" "\$@"
APP
  chmod +x "$APP/Contents/MacOS/richmack-browser"
  # Desktop shortcut is a symlink, leaving the canonical app in ~/Applications.
  mkdir -p "$HOME/Desktop"
  ln -sfn "$APP" "$HOME/Desktop/Richmack Browser.app"
  echo "Installed app: $APP"
  echo "Desktop icon: $HOME/Desktop/Richmack Browser.app"
  open "$APP" || "$INSTALL_ROOT/launcher/richmack-browser"
else
  DESKTOP_FILE="$HOME/.local/share/applications/richmack-browser.desktop"
  mkdir -p "$HOME/.local/share/applications"
  sed "s|__INSTALL_ROOT__|$INSTALL_ROOT|g" "$INSTALL_ROOT/platform/linux/richmack-browser.desktop.in" > "$DESKTOP_FILE"
  chmod +x "$DESKTOP_FILE"
  if command -v update-desktop-database >/dev/null 2>&1; then update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true; fi
  if [ -d "$HOME/Desktop" ]; then
    cp "$DESKTOP_FILE" "$HOME/Desktop/Richmack Browser.desktop"
    chmod +x "$HOME/Desktop/Richmack Browser.desktop"
    if command -v gio >/dev/null 2>&1; then gio set "$HOME/Desktop/Richmack Browser.desktop" metadata::trusted true >/dev/null 2>&1 || true; fi
    echo "Desktop icon: $HOME/Desktop/Richmack Browser.desktop"
  fi
  echo "Application menu entry: $DESKTOP_FILE"
  "$INSTALL_ROOT/launcher/richmack-browser" >/dev/null 2>&1 &
fi

echo
echo "Install complete."
echo "Extensions: Core, Extract, Images, Email, Media, Feed, Pick, Automate"
