# Richmack Browser OS security model

- Chromium stays upstream; Richmack does not patch Chromium's security engine.
- Backend binds only to `127.0.0.1:8765`.
- No terminal or arbitrary shell endpoint.
- Docker container runs non-root, drops Linux capabilities, uses no-new-privileges, and has a read-only root filesystem.
- Downloads and generated feeds are confined to the mounted Richmack Downloads directory.
- Page scripts cannot directly execute local commands.
- Page access is injected only after a user action or keyboard-mode action.
- Persistent site access remains optional.
- Automation requires user-triggered element picking or a text search followed by selection of a specific match.
- Native feed detection only reads the current page. Generated RSS does not recursively crawl linked pages.
- Media downloads allow HTTP/S URLs only and invoke yt-dlp without shell execution.
