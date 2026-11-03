# 0006: Rename the project to Tickdeck

- Status: Accepted
- Date: 2026-10-14

## Context

The project was named after the scheduler it was first built to display. It is now a general local dashboard for agent-written cards and alerts, and the old name no longer fits. Nobody outside the owner uses the previous package name.

## Decision

- **Rename everything to Tickdeck.** Package name, CLI bin, environment variables (`TICKDECK_*`), the `X-Tickdeck` request header, the default data directory, the skill name and the browser localStorage keys.
- **No data migration, no aliases.** The previous names are not read, accepted or redirected. This is an owner choice: with no other users, compatibility shims are pure cost.
- **Scheduler references are reworded generically.** Mentions of the separate scheduler now describe it as "a scheduler" or "any scheduler". They are never replaced with the new name, because the scheduler is a different product.
- **Historical docs are rewritten in-tree only.** Docs and planning files use the new name. Git history is untouched.
- **Repo folder and git remote follow.** The local folder is moved and the remote renamed after the change lands.

## Alternatives considered

Keeping the previous name; renaming with deprecated aliases for env vars and the header; a one-time data directory migration.

## Consequences

One consistent name across code, docs and runtime surfaces. Any leftover state under the previous data directory or localStorage keys is ignored. Schema titles change to `tickdeck <type> card data`; schemas have no `$id`, so no URLs change. Old clones need their remote updated.

## Revisit when

The project is published or gains users who depend on a previous name, which would make aliases or a migration worth adding.
