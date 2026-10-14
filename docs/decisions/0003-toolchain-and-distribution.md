# 0003: Toolchain and distribution

- Status: Accepted, amended 2026-10-07
- Date: 2026-10-05

## Context

tickdeck runs on the same machine as the agents (Linux VPS, Windows or macOS laptop) and should install the same way as a typical daemon-style CLI.

## Decision

- **One npm package** `tickdeck`, ESM-only, Node >= 22.5, containing the CLI, server, built UI, generated schemas, templates, and the Claude skill. Global install or `npx`.
- **TypeScript everywhere.** Server and CLI built with tsup; UI is React plus Vite, with react-grid-layout for the grid *(superseded 2026-10-07: no drag/resize, fixed three-column CSS layout, so this dependency is dropped; see [ADR 0002 amendment](0002-generic-visual-types-and-card-contract.md#amendment-2026-10-07-card-folders-declared-layout-single-file-alerts))*; vitest for tests; Playwright for one smoke path.
- **Build order:** generate schemas, build the UI, bundle the server, copy the UI into the package.
- **Few runtime dependencies,** platform APIs preferred (see [P8](../tech/design-principles.md)): Hono, commander, croner (cron windows), env-paths, node-notifier, zod. UI libraries are bundled at build time.
- **Data location** via `env-paths` with a `TICKDECK_HOME` override; a fixed default port on loopback with free-port fallback.
- **CLI** follows daemon-style CLI conventions: `start`, `daemon start|stop|status`, `info`, `validate`, `templates`, and `skill install`. `info` works with the server stopped.
- **Releases** use changesets and CI verification of the packed tarball.

## Alternatives considered

- Docker: unnecessary on a VPS; bad fit for a desktop notification path.
- Per-OS installers: more to maintain than one npm package.
- A different language or framework: no benefit; TypeScript gives shared types between server and UI.
- Installing the skill automatically: skill install is an explicit owner command, not a side effect of package install.

## Consequences

Easier: one install path, shared daemon-style conventions, shared types across the boundary. Harder: Node >= 22.5 is required; the UI must be built before the package is complete.

## Revisit when

Node requirements change, or a non-Node install path is needed.
