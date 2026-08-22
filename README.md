# Richmack Browser OS v0.6.0

Richmack Browser OS is a lightweight, dark Chromium distribution layer: a dedicated Chromium profile, a custom Richmack new-tab experience, eight separate toolbar extensions, and an optional localhost container for generated feeds/media services. It keeps Chromium's native tabs and security/update path rather than maintaining a Chromium fork.

## What is included

- **Richmack Core** — wolf branding, dark new tab, workspaces, Richmack/qutebrowser-style keyboard mode and `:` commands.
- **Extract** — links, readable text, PDFs and document URLs.
- **Images** — detect and download page images.
- **Email** — extract and deduplicate visible and `mailto:` email addresses.
- **Media** — video/audio handoff to the local service.
- **Feed** — detect native RSS/Atom, create semantic job feeds, preview/read results, export RSS for Newsboat.
- **Pick** — visually select a one-off page element.
- **Automate** — record/replay workflows and bulk-run matching visible controls with confirmation, delay and caps.

The extensions remain individual Chromium toolbar icons. Chromium owns the toolbar pin state; Richmack seeds `pinned_by_default` on a fresh profile and Chromium remembers your layout afterward.

## Supported desktop platforms

The installer automatically detects:

- **macOS** — installs a real `Richmack Browser.app` to `~/Applications` and places a Richmack Browser icon on the Desktop.
- **Ubuntu / Debian Linux** — installs a desktop launcher to `~/.local/share/applications` and, when a Desktop folder exists, places a launch icon there too.

The package copies itself to a persistent install directory, so you can delete the extracted ZIP folder after installation.

## One-command install

### macOS

```bash
cd ~/Downloads
unzip richmack-browser-v0.6.0.zip
cd richmack-browser-v0.6.0
./install.sh
```

If Chromium is missing and Homebrew is available, the installer installs Chromium for you. macOS may require you to approve Chromium the first time it is opened.

Installed locations:

```text
~/Applications/Richmack Browser.app
~/Desktop/Richmack Browser.app
~/Library/Application Support/Richmack Browser
~/.richmack/browser-profile-v054
```

### Ubuntu / Debian

```bash
cd ~/Downloads
unzip richmack-browser-v0.6.0.zip
cd richmack-browser-v0.6.0
./install.sh
```

If Chromium is missing and Snap is available, the installer runs `sudo snap install chromium`.

Installed locations:

```text
~/.local/share/richmack-browser
~/.local/share/applications/richmack-browser.desktop
~/Desktop/Richmack Browser.desktop     # when ~/Desktop exists
~/.richmack/browser-profile-v054
```

## Desktop icon

The desktop application uses the Richmack blue wolf icon in `assets/`. macOS receives an `.icns` application icon; Linux receives PNG icons and a `.desktop` launcher.

## Extension-only package

You do **not** have to distribute the whole browser package. `richmack-extension-suite-v0.6.0.zip` contains only the eight Richmack Chromium extensions.

This is useful for someone who wants Richmack tools in an existing Chromium profile without the desktop application or Docker backend.

For development/unpacked installation:

1. Extract `richmack-extension-suite-v0.6.0.zip`.
2. Open `chrome://extensions` in Chromium.
3. Enable **Developer mode**.
4. Choose **Load unpacked** for whichever extension folders you want.

Because Richmack uses separate extensions to provide separate native toolbar icons, each tool is its own folder. The extension-only bundle does not silently modify a user's normal Chromium profile.

## Dark mode

The Richmack launcher always starts Chromium with dark UI flags and keeps all Richmack pages/popups dark:

```text
--force-dark-mode
--enable-features=WebUIDarkMode
```

## Richmack Mode

Toggle from Core or `Command+Shift+Space` on macOS.

```text
j / k    scroll
h / l    back / forward
gg / G   top / bottom
f        link/button hints
J / K    previous / next tab
d        close tab
u        reopen tab
:        Richmack command bar
```

## Automation

Two automation styles are available:

1. **Recorder/replayer** — press Record, perform a workflow once, Stop, name it and save it. Replay later.
2. **Bulk sequence** — find every visible control whose accessible label matches a phrase such as `Follow`, preview the matches, set a cap/delay, and run the selected action sequentially.

Bulk runs re-query the live DOM after each click. Exact matching is enabled by default so `Follow` does not match `Following`. Runs are capped and confirmed, and Richmack does not bypass CAPTCHAs or site rate limits.

Passwords are never recorded. Replay stops at secret fields and flagged final/consequential actions.

## Feed / RSS / Newsboat

Feed first uses a site's native RSS/Atom when available. When a native feed does not exist, Richmack can generate a local RSS 2.0 feed. Known job pages receive semantic cleanup so salary, FAQ and navigation links are excluded.

Generated URLs look like:

```text
http://127.0.0.1:8765/feeds/richmack-xxxxxxxxxxxxxxxx.xml
```

Newsboat running on the same machine can subscribe directly by adding a line to `~/.newsboat/urls`:

```text
http://127.0.0.1:8765/feeds/richmack-xxxxxxxxxxxxxxxx.xml "richmack"
```

## Optional local service container

The browser itself is **not** containerized. The optional backend is. When Docker is installed, `install.sh` starts the service on localhost only:

```text
127.0.0.1:8765
```

It supports generated RSS and media/document backend tasks while keeping the desktop browser native.

## Security model

- Backend binds only to `127.0.0.1`.
- No webpage gets shell access.
- No Docker socket is mounted into the service container.
- Site automation permissions are user-directed.
- Password values are never stored.
- Final/consequential workflow steps require manual control.
- Downloads are sandboxed to `~/Downloads/Richmack`.
- No recursive site crawling by default.

See `docs/SECURITY.md` for additional details.

## Uninstall

From the extracted package or installed source:

```bash
./uninstall.sh
```

Uninstall intentionally leaves the Richmack profile at `~/.richmack/browser-profile-v054` so logins/bookmarks are not destroyed. Remove that directory manually only if you want a complete profile reset.

## Release artifacts

A v0.6.0 release can publish both:

```text
richmack-browser-v0.6.0.zip            full macOS/Ubuntu installer
richmack-extension-suite-v0.6.0.zip    extensions only
```

This lets users choose between the full Richmack Browser experience and the standalone Richmack toolbar toolkit.
