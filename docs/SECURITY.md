# Richmack Browser OS v0.5 Security Notes

Richmack intentionally keeps Chromium upstream rather than forking its rendering/security engine. The eight toolbar extensions are separated by capability so a simple page tool does not automatically inherit every Richmack permission.

The local FastAPI service binds to loopback only. Docker uses a read-only root filesystem, drops Linux capabilities, applies `no-new-privileges`, limits CPU/memory/PIDs, and mounts only `~/Downloads/Richmack` writable. No Docker socket, SSH keys, home directory, browser cookies, or shell are mounted.

Automation is intentionally user-driven. Pick mode saves only a selector, label and source URL. Automate searches visible interactive elements and asks for confirmation before clicking. It does not silently bulk-follow accounts or bulk-submit applications.

The Richmack Core content script registers lightweight keyboard listeners on HTTP/S pages. Extraction scripts are injected on demand only when a toolbar tool is used.
