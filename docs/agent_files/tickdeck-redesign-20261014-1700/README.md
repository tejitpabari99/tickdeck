---
status: approved
summary: Index for the Tickdeck redesign — five sub-project PRDs (rename, mockup, visual port, side/center + table, new types), dependencies, locked decisions, cross-PRD interfaces, resolved owner decisions and manual steps.
date: 2026-10-14
---
# Tickdeck redesign — design index

Brief: [brainstorm.md](brainstorm.md) (amends the 2026-10-07 initial brainstorming; where they conflict, this brief wins).

## Sub-projects
| # | Folder | Scope | Depends on | Phase | Status |
|---|---|---|---|---|---|
| 01 | [01-rename](01-rename/PRD.md) | Mechanical rename to Tickdeck (package, bin, env, data dir, skill, UI, all docs, remote); scheduler refs reworded; final task = folder move + worktree repair + `projects/README.md` | none | 1 (final task: 5) | approved |
| 02 | [02-mockup](02-mockup/PRD.md) | One static `mockup.html` (Catppuccin Mocha, JetBrains Mono, Glance model), private Artifact; owner approval gate | none | 1 | done |
| 03 | [03-visual-port](03-visual-port/PRD.md) | Rewrite UI CSS on Glance's file split, single theme, bundled font, card frame, header + status-dot fix, NOTICE, CSS hook contract | 01, 02 (approved) | 2 | done |
| 04 | [04-side-center-table](04-side-center-table/PRD.md) | Sides = permanent reference (registry `sides`, `permanent`, server guards); table truncation, widths, re-sort, date display | 03 | 3 | done |
| 05 | [05-types](05-types/PRD.md) | `calendar`, `bookmarks`; list `style` + `meta`; media `meta`/`row`/restyle | 03, 04 | 4 | done |

```
01 rename ─┐
           ├─► 03 visual-port ─► 04 side-center-table ─► 05 types ─► 01 final task (repo folder move + git worktree repair + /root/projects/README.md)
02 mockup ─┘ (owner approval gates 03)
```
ADR numbers (existing 0001-0005): 01 = 0006, 03 = 0007, 04 = 0008, 05 = 0009. Each SP also ships its own changeset.

## Locked decisions (from brief)
- Port Glance's look into the React app; no fork. Re-implement values/structure, stay MIT, credit Glance in `NOTICE`.
- Rewrite UI CSS from scratch on Glance's file split; ~8 inputs derive all colours.
- One theme (Catppuccin Mocha), no toggle; JetBrains Mono bundled locally (woff2 + OFL).
- Rename everything to Tickdeck, no migration, no hint, no aliases; folder move last.
- Sides reject `table`/`list` (Broken with reason); sides drop priority, Now, Done/Completed, updated badge, hide; keep fullscreen, stale, Broken.
- Table: auto-size + optional `width`, ellipsis + tooltip, re-sort on refresh, short dates sorted by real time.
- New types `calendar`, `bookmarks` (side-allowed); list `style rows|detailed`; media restyle. Tickdeck fetches nothing.
- Mobile keeps stacking (center, left, right). Keep list `links`, hidden popover, notifications, Now zone.
- Static mockup approved before any React work.

## Cross-PRD interfaces
| Interface | Owner SP | Consumers |
|---|---|---|
| `ViewCard.permanent` (= column !== center) | 04 | 03 (selector), frame, attention logic |
| Frame classes `card--side` / `card--center` + `data-permanent` attr | 03 (classes), 04 (attr) | 04, 05 |
| Registry `sides: 'allow'\|'deny'` + `sidesAllowed()` | 04 | 05 (declares per new type), CLI, ingest |
| Registry `view` zod + `ViewCard.style?` + `folder-validate` view check | 05 | list (`style`) |
| CSS hook table (03 PRD "CSS hooks contract") incl. `col-w-*`, `.cell-truncate`, `.tbl-wrap` | 03 | 04, 05 |
| Token block (inputs + derived, spacing) | 02 (spec) / 03 (implements) | 03, 05 |
| `colorSchema` (`primary\|positive\|negative\|H S L`) | 05 | calendar, bookmarks |
| `NOTICE` | 03 | packaging (`files`) |
| Rename map / `TICKDECK_*` / `X-Tickdeck` | 01 | 02-05 (all new strings use Tickdeck) |
| Folder move + worktree repair | 01 final task | after 05 |

## Resolved by owner 2026-10-14
- [01](01-rename/PRD.md): keep unscoped npm name `tickdeck` (verified not on registry).
- [02](02-mockup/PRD.md): mockup flatness resolved; owner approval of the published mockup is the gate for 03.
- [03](03-visual-port/PRD.md): screenshot reference = `02-mockup/mockup.html` in repo.
- [03](03-visual-port/PRD.md)/[04](04-side-center-table/PRD.md): 03 ships table CSS classes (`col-w-*`, `.cell-truncate`, `.tbl-wrap`); 04 only applies classes + owns behaviour; wording aligned.
- [04](04-side-center-table/PRD.md): D10 bad cell in `sort:'date'` column = warning (raw text, sorts last, card OK), not a contract error.
- [04](04-side-center-table/PRD.md): table widths xs/s/m/l = 4/7/11/18rem approved as starting values; 03 may retune.
- [05](05-types/PRD.md): media `row` scroll container gets `tabindex="0"` + accessible label; smoke check.
- [05](05-types/PRD.md)/brief/[02](02-mockup/PRD.md): calendar agenda = selected day, default today; click day selects; `days` dropped (`{ events }` only); agents write events for >= visible month; selection UI-local, not persisted.

## Remaining [OPEN] items
None.

## [DEFERRED]
- 01: mockup/artifact titles say Tickdeck (no coordination); merge to `main` (main keeps old name until merge).
- 02: status-dot fix (done in 03/04); screenshot reference for 03 (taken from approved mockup).
- 03: subset font to Latin; cleanup of old `tickdeck.theme` localStorage key.
- 04: per-card alignment of numeric columns; user column resize.

## Owner manual steps
1. Open private mockup Artifact (02), check desktop + phone width, record "approved <date>" — gates 03. Mockup: https://claude.ai/artifact/Sfh39zJUSLtyYefdyPKSbM (published 2026-10-14, private). **Approved 2026-10-14.**
2. Create/rename GitHub repo `tejitpabari99/tickdeck` (01). **Done (gh confirms repo name tickdeck).**
3. (done) `tickdeck` npm name verified free (01).
4. Old data dir: none found locally; delete by hand if one exists elsewhere (01).
5. Out-of-repo paths keyed by old name, listed not edited: `/root/.claude/projects/-root-projects-crontick-dashboard/`, `/root/.claude/history.jsonl`, any `~/.claude/skills/crontick-dashboard/`; re-run `tickdeck skill` if used (01).
6. Provide JetBrains Mono woff2 if network-restricted; final eyeball of 03 screenshots vs mockup (03). Screenshots: 03-visual-port/screenshots/, 05-types/screenshots/.
7. Existing owner table/list cards in side columns will go Broken after 04; rewrite them (04).
8. Final task: folder move to `/root/projects/tickdeck`, `git worktree repair`, update `/root/projects/README.md` row (01).
