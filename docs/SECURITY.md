# Richmack Browser OS Security Model

## Trust boundaries

A webpage is untrusted. It must never have a direct path to the local shell, Docker API, filesystem, or Richmack service controls.

```text
UNTRUSTED WEBPAGE
      |
      | user-triggered extension action only
      v
RICHMACK EXTENSION
      |
      | explicit validation / permission check
      v
LOCAL RICHMACK SERVICE
      |
      +--> sandboxed downloads
      +--> allowlisted commands
```

## Current controls

- Manifest V3.
- No always-on all-sites content script.
- `activeTab` is used for user-triggered page inspection.
- Automation host permissions are optional and requested at run time.
- Local backend is reachable through `127.0.0.1` only from the host.
- Container runs as UID 10001 and drops all capabilities.
- `no-new-privileges` enabled.
- Container root filesystem is read-only.
- `/tmp` is a limited `tmpfs` with `noexec`, `nosuid`, and `nodev`.
- Work directory is mounted read-only.
- Downloads are confined to a dedicated mounted directory.
- Document path traversal is rejected after canonical path resolution.
- Terminal command input is an exact allowlist lookup.
- subprocesses use argument arrays with `shell=False`.
- Commands have short timeouts and bounded output.
- Media URL input accepts HTTP/S only and rejects embedded URL credentials.
- yt-dlp is invoked with `--no-exec`, `--no-playlist`, restricted filenames, and a maximum file size.
- FastAPI interactive docs are disabled.

## Things intentionally not present in v0.1

- arbitrary shell terminal
- Docker socket mount
- host filesystem mount
- SSH private key mount
- browser credential extraction
- automatic form-password capture
- cloud-exposed API
- remote code execution hooks
- downloaded script execution
- unrestricted Playwright endpoint

## Before public distribution

- Sign release artifacts.
- Produce reproducible checksums.
- Add dependency and container vulnerability scanning.
- Add Content Security Policy review for extension pages.
- Replace development extension loading with signed/store distribution where appropriate.
- Add origin-aware CSRF/authentication token for localhost service calls.
- Add rate limits and job concurrency limits.
- Add download MIME/type validation.
- Add audit log with sensitive-value redaction.
- Add explicit permission UI for every capability that touches local resources.
- Threat-model Native Messaging before enabling a true interactive host terminal.
