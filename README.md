# Richmack Browser OS v0.5.0

Richmack v0.5 changes the interface from one large extension popup to a **suite of small native Chromium toolbar extensions**. The browser keeps native Chromium tabs and security updates, while the Richmack layer supplies its own dark new-tab experience, keyboard mode, extraction tools, automation helpers, and local RSS/media services.

## Toolbar suite

- **Richmack Core** — wolf icon, Richmack Mode, dark new tab, workspaces, `:` command bar.
- **Extract** — links, readable page text, PDFs and document links.
- **Images** — detect images and download one or up to 25 at a time.
- **Email** — extract and deduplicate visible and `mailto:` email addresses on the current page.
- **Media** — one-click handoff to the local `yt-dlp` service. A badge reports success/failure.
- **Feed** — detects native RSS/Atom feeds; if none exists it can generate a local RSS feed from page items.
- **Pick** — visually select one page element. Selection is shared through the localhost backend.
- **Automate** — find visible controls by label (for example `Follow`, `Easy Apply`, `Next`) and click only after confirmation, or click a target previously selected with Pick.

## Richmack Mode

Toggle from the wolf icon or `Command+Shift+Space` on macOS.

- `j` / `k` — scroll
- `h` / `l` — back / forward
- `gg` / `G` — top / bottom
- `f` — link/button hints
- `J` / `K` — previous / next tab
- `d` — close tab
- `u` — reopen closed tab
- `:` — compact command bar

The mode content script is deliberately tiny and event-driven: no page polling, no DOM scanning until a tool is invoked.

## Install

```bash
cd ~/Downloads
unzip richmack-browser-v0.5.0.zip
cd richmack-browser-v0.5.0
./install.sh
```

The launcher uses a dedicated profile at `~/.richmack/browser-profile-v050` and automatically loads the eight Richmack extension folders. It never falls back to Google Chrome.

If the individual icons are not visible, open `chrome://extensions` and enable **Pin new extensions to Toolbar**, then relaunch Richmack. Chromium decides toolbar pinning; extensions cannot programmatically pin themselves.

## Security model

- Browser pages never receive shell access.
- Backend binds only to `127.0.0.1:8765`.
- Container runs read-only, non-root, with capabilities dropped.
- Page scanning happens only when a tool is clicked.
- Automation actions require a user-selected target or explicit text query and confirmation.
- Media downloads are sandboxed to `~/Downloads/Richmack`.
- No recursive site crawling by default.

Generated RSS feeds are local URLs under `http://127.0.0.1:8765/feeds/` and are not exposed to the LAN or internet.
