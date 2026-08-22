# Richmack Browser OS v0.5.5

Richmack Browser is a dedicated Chromium profile plus eight small native-toolbar extensions. It keeps Chromium's native tabs/security update path while adding a dark Richmack identity, qutebrowser-style keyboard control, extraction/media/feed tools, and user-directed browser automation.

## v0.5.5 changes

### Dark Chromium by default

The launcher now starts Chromium with `--force-dark-mode` and `WebUIDarkMode`. Richmack's new-tab page and every Richmack tool remain dark as well.

### Individual toolbar icons, pinned by default on the fresh v0.5.5 profile

The eight tools remain separate native Chromium actions: **Core · Extract · Images · Email · Media · Feed · Pick · Automate**. Chromium itself owns the toolbar, so Richmack cannot call an extension API to pin itself after startup. Instead, the dedicated v0.5.5 profile is seeded with Chromium's own `extensions.pinned_by_default` preference before first launch. Chromium source defines this preference specifically as whether new extensions should be pinned by default.

The v0.5.5 launcher uses `~/.richmack/browser-profile-v054`, leaving older Richmack profiles untouched. Once Chromium has created the profile, it remembers toolbar state normally.

### Automation recorder/replayer

Pick remains available for one-off targets, but is no longer required for normal automation.

1. Open the **Automate** lightning icon.
2. Click **Record** and grant permission for the current site when Chromium asks.
3. Perform the workflow once: clicks, Next buttons, selections, and ordinary text fields are recorded.
4. Reopen **Automate**, click **Stop**, name the workflow, and save it.
5. Use **Run** later to replay the saved sequence.

The recorder uses semantic labels as a fallback when a CSS selector changes. It never stores password values. Password/secret fields stop replay for manual entry. Steps that look like final submissions, purchases, posts, sends, or other consequential final actions are marked for confirmation and replay stops before them.

An active recording can survive same-site navigation after the user has explicitly granted that site's origin permission. Richmack does not request blanket browsing access at install time.

## Toolbar suite

- **Richmack Core** — wolf icon, dark Richmack new tab, workspaces, Richmack Mode, `:` command bar.
- **Extract** — links, readable text, PDFs and document links.
- **Images** — detect/download page images.
- **Email** — extract/deduplicate visible and `mailto:` addresses.
- **Media** — video/audio handoff to the local yt-dlp service.
- **Feed** — native RSS/Atom detection, semantic job feeds, Richmack Feed Reader, generated local RSS.
- **Pick** — visually select a one-off page element.
- **Automate** — record/save/replay workflows and find controls by text.

## Richmack Mode

Toggle from Core or `Command+Shift+Space` on macOS.

- `j` / `k` — scroll
- `h` / `l` — back / forward
- `gg` / `G` — top / bottom
- `f` — prefix-free link/button hints
- `J` / `K` — previous / next tab
- `d` — close tab
- `u` — reopen closed tab
- `:` — Richmack command bar

## Install

```bash
cd ~/Downloads
unzip richmack-browser-v0.5.5.zip
cd richmack-browser-v0.5.5
./install.sh
```

Chromium must already be installed at `/Applications/Chromium.app`. The installer starts/updates the localhost backend when Docker is available and launches the dedicated v0.5.5 Richmack profile.

## RSS / Newsboat

Generated feeds remain standard RSS 2.0 at local URLs such as:

```text
http://127.0.0.1:8765/feeds/richmack-xxxxxxxxxxxxxxxx.xml
```

Newsboat running on the same Mac can subscribe to those URLs directly. Native RSS/Atom is preferred when a site publishes one; known page types such as Indeed job results get semantic cleanup; generic pages use conservative repeated-content extraction.

## Security

- Backend binds only to `127.0.0.1:8765`.
- No webpage gets shell access.
- Automation site permission is requested when recording begins, not globally at installation.
- Passwords are never stored by the recorder.
- Replay stops at secret fields and flagged final/consequential actions.
- Downloads remain sandboxed to `~/Downloads/Richmack`.
- No recursive site crawling by default.

## v0.5.5 bulk sequence automation

Automate can now find every visible control whose accessible label matches a phrase such as `Follow`, preview those matches, and run the same action sequentially. The default cap is 10 actions per run, adjustable from 1–25, with a 1–10 second delay between actions. Exact label matching is enabled by default so `Follow` does not accidentally match `Following`. The engine re-queries the live DOM after each click, which is more reliable on dynamic social/job pages than replaying a stale list of CSS selectors. A Stop button cancels the sequence after the current click.

Bulk sequence is intentionally limited to the currently rendered page state and requires a confirmation before each run. It does not auto-scroll an infinite feed, bypass CAPTCHAs, or override site rate limits.
