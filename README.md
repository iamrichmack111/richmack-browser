# Richmack Browser OS v0.4.0

Richmack Browser OS is a Chromium configuration + toolbar-first extension. v0.4 keeps native Chromium tabs for speed and security while adding keyboard navigation, extraction, safe click automation, workspaces, smart bookmarks, media downloading, and RSS/feed tools.

## What's new in v0.4

- Toolbar-first Richmack popup; no terminal.
- `:` command opens an in-page qutebrowser-style command bar.
- Keyboard mode: `j/k` scroll, `h/l` back/forward, `f` hints, `J/K` tab switching, `d` close tab, `u` reopen tab, `:` commands.
- Visual element picker for safe one-target automation.
- Find controls by visible text such as `Easy Apply`, `Follow`, `Download`, or `Next`, then click only the selected match.
- Extract links, images, emails, documents, visible text, and media references.
- Native RSS/Atom discovery from pages that advertise feeds.
- Local RSS generation from repeated content links when a site has no native feed.
- Generated feeds are served only on `127.0.0.1:8765` by the Richmack service.
- Native Chromium tabs remain at the top; workspaces use Chromium tab groups.

## Install / upgrade

```bash
cd ~/Downloads
unzip richmack-browser-v0.4.0.zip
cd richmack-browser-v0.4.0
./install.sh
```

Then open `chrome://extensions`, disable/remove the older Richmack extension, choose **Load unpacked**, and select `extension/` from this v0.4 folder.

Start the backend with:

```bash
docker compose up -d --build
curl -s http://127.0.0.1:8765/health
```

Launch Richmack Chromium with:

```bash
./launcher/richmack-browser
```

## Feed workflow

Click the Richmack wolf toolbar icon, then **Feed**. If the page exposes RSS/Atom, Richmack shows the native feed URL. If not, **Generate RSS** creates a local RSS file from suitable repeated page links and returns a local URL such as:

`http://127.0.0.1:8765/feeds/richmack-<id>.xml`

The generated feed is local to your machine. It does not crawl linked pages automatically.

## Automation safety

Richmack does not expose a local shell. Page automation is user-triggered. `Pick` selects one element. `Find button` searches visible controls by text and requires you to choose the specific match. Richmack does not bulk-follow accounts or bulk-submit applications by default.
