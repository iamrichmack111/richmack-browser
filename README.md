# Richmack Browser OS v0.3.0

Richmack Browser OS is a lightweight Chromium configuration and extension layer designed to feel like its own browser without maintaining a Chromium fork.

## What changed in v0.3

v0.3 pivots away from a permanent dashboard. Richmack now uses a subtle wolf toolbar button that opens a compact action tray. The detailed side panel is optional and hidden until you press **More**.

The default new-tab page is also Richmack-branded, dark, minimal, and workspace-aware.

### Toolbar-first actions

- Extract page data
- Download images
- Hand a media page to the local yt-dlp service
- Visually pick a button/link for automation
- Save a smart bookmark
- Open detailed tools only when needed
- Toggle Richmack keyboard mode

Chromium gives one toolbar slot per extension. Richmack therefore uses one wolf toolbar icon containing a compact row of tool icons. Multiple independent top-toolbar icons would require separate mini-extensions or a Chromium source fork.

## Workspaces

Richmack workspaces use Chromium tab groups rather than trying to replace Chromium's native tab strip.

Default workspaces:

- Development
- Research
- Automation
- Media

Use **Assign tab** to attach the current tab to the active workspace. Switching a workspace activates one of its tabs and collapses other Richmack workspace groups.

Domain routing can automatically assign known sites to a workspace.

## Extraction

The scanner can identify:

- links
- images
- email addresses
- video URLs exposed in the page
- PDFs
- EPUB/TXT/Markdown/CSV/JSON/ZIP and common office-document links
- visible page text

Direct resources such as `.pdf`, `.epub`, `.txt`, `.csv`, `.json`, `.mp4`, `.mp3`, and `.zip` are recognized from the current tab URL even when Chromium blocks DOM injection into its built-in viewer.

The popup uses clean-link normalization for copied URLs and removes common tracking parameters.

## Automation

The v0.3 automation flow is visual:

1. Click the Richmack wolf.
2. Click **Pick**.
3. Hover over the page.
4. Click the button or link you want Richmack to remember.
5. Reopen Richmack and use **Click saved target**.

The page itself never receives shell access. Automation remains user-triggered.

## Keyboard mode

Toggle **MODE** from the popup or use `Command+Shift+Space` on macOS.

- `j` — scroll down
- `k` — scroll up
- `g` — top
- `G` — bottom
- `f` — letter hints for clickable elements

## Terminal removed

The terminal UI was intentionally removed in v0.3. The previous container shell added complexity without providing a true local terminal, and exposing the user's real shell would materially increase the browser's attack surface.

## Local service

The optional Docker service remains available for media and document-related backend work. It binds only to:

`127.0.0.1:8765`

The browser still works when the service is offline; only backend-dependent actions are unavailable.

## Install

```bash
cd ~/Downloads
unzip richmack-browser-v0.3.0.zip
cd richmack-browser-v0.3.0
./install.sh
```

If Chromium is already open with an older unpacked Richmack extension, visit `chrome://extensions`, remove/disable the old version, and load:

`/Users/richmack/Downloads/richmack-browser-v0.3.0/extension`

## Launch

```bash
cd ~/Downloads/richmack-browser-v0.3.0
./launcher/richmack-browser
```

Richmack uses its own Chromium profile at:

`~/.richmack/browser-profile`

The launcher intentionally does not fall back to Google Chrome.

## Security defaults

- no arbitrary shell execution
- no terminal UI
- no Docker socket mount
- service bound to localhost only
- page scripts cannot call the local service directly through Richmack
- DOM tooling is injected only after a user action
- automation is user-triggered
- no global HTTP/S host permission granted by default
- Chromium component updates are not disabled by the launcher

Run the local checks with:

```bash
./tests/smoke.sh
```
