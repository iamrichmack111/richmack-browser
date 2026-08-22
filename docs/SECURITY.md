# Richmack Browser OS Security Model — v0.3.0

Richmack is deliberately an extension/configuration layer on upstream Chromium instead of a Chromium source fork. Chromium remains responsible for the browser engine, sandbox, renderer isolation, and security updates.

## Boundaries

Web pages do not receive a direct path to the host shell, Docker socket, SSH keys, or local filesystem. Richmack injects content tooling only following user actions such as extraction, keyboard mode, or element picking.

The optional backend listens only on `127.0.0.1:8765`. The Docker Compose configuration does not publish it to the LAN, does not mount the Docker socket, drops Linux capabilities, runs as a non-root user, uses a read-only root filesystem, and limits resources.

## Automation

Automation is intentionally narrow in v0.3. The user visually picks an element, Richmack stores a selector, and the user may replay that click. Richmack does not expose arbitrary JavaScript evaluation or arbitrary command execution.

## Terminal

The terminal interface was removed. A container shell was not useful enough to justify the interface and a real local shell would increase compromise impact.

## Chromium updates

The launcher no longer disables Chromium component updates or background networking. Richmack should not weaken upstream security maintenance merely to appear lighter.

## Permissions

`activeTab` and `scripting` are used for user-triggered page tooling. Persistent HTTP/S host access remains optional rather than globally granted at install time.

## Downloads

Downloads initiated by the extension use Chromium's downloads API. Backend media downloads are written only to the configured Richmack download mount.
