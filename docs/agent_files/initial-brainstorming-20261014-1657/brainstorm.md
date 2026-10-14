---
status: draft
summary: Rename to Tickdeck; rewrite the UI CSS on Glance's structure and theme (Catppuccin Mocha, JetBrains Mono); sides = permanent reference, center = moving work; table fixes; new calendar/bookmarks types; mockup gate before build.
date: 2026-10-14
---

# Brainstorm — Tickdeck: rename + Glance visual port

Amends [`../initial-brainstorming-20261007-1648/brainstorm.md`](../initial-brainstorming-20261007-1648/brainstorm.md). Where they conflict, this brief wins.

## TL;DR

The project becomes **Tickdeck** everywhere, with no remaining references to crontick. The UI keeps our React app but its CSS is rewritten from scratch on Glance's file structure and theme model: a small set of HSL inputs from which all colours are derived, JetBrains Mono at 13px, title above a subtle box, 23px gaps, fixed 300px side columns. Single dark theme, Catppuccin Mocha. Left/right columns become permanent reference (no Done, no priority, no tables or lists); center holds moving work. Table overflow and sort bugs get fixed, and `calendar` and `bookmarks` types are added. A static mockup must be approved before any React work.

## Problem

The current UI looks barren and boring, and the table overflows and sorts wrongly. Side and center columns behave the same, although the owner treats sides as permanent and center as transient. The name "crontick dashboard" is being replaced by Tickdeck. The new repo is https://github.com/tejitpabari99/tickdeck.git.

## Decision log

| Decision | Alternative rejected | Why |
|---|---|---|
| Port Glance's look into our React app | Fork Glance (Go); use Glance as renderer | Glance only fetches on page load, has no live push, and its widget HTML runs no scripts, so we would lose Done, alerts, write-back and live updates. A fork also means AGPL + Go |
| Re-implement Glance values/structure, stay MIT, credit Glance in NOTICE | Paste CSS verbatim + relicense AGPL; paste and ignore | Same look, no license lock-in |
| **Rewrite UI CSS from scratch on Glance's file split** (`main` tokens / `site` / `utils` / `widgets` + per-type files) | Swap token values onto existing CSS, rebuild only frame + columns | Owner choice. Glance derives every colour from ~8 inputs (`--bgh/--bgs/--bgl`, primary, positive, negative, `--cm` contrast multiplier, `--tsm` text-saturation multiplier) via `calc()`, and keeps per-widget CSS in separate files, so future reskins are low-impact. Verified in `glance/internal/glance/static/css/main.css` |
| Single theme: Catppuccin Mocha; drop light mode + toggle | Glance default, Teal City, Dracula, Kanagawa | Best positive/negative status colours; 8 values to swap later |
| JetBrains Mono bundled locally (woff2 + OFL license file) | system-ui; CDN | Half of the Glance look; no CDN, no runtime dep |
| Rename everything to Tickdeck: package, CLI `tickdeck`, env `TICKDECK_*`, data dir, skill, UI, all docs incl. old `docs/agent_files`, ADRs, git remote, repo folder `/root/projects/tickdeck`, `projects/README.md`. No crontick references remain | Keep scheduler references; migrate old data | Owner: plain rename, pre-1.0, nobody uses it |
| No data-dir migration, no "move it" hint | Auto-copy; CLI hint | Not in production |
| Sides reject `table`/`list`: validate + ingest fail, card shows Broken with reason | Silently move to center; allow with guidance | Explicit; agents learn from the error |
| Table columns auto-size + optional per-column `width: xs/s/m/l/fill` | Auto only; agent must set | Auto covers most cases; agent can narrow "From", fill "Subject" |
| Table: cells clip with ellipsis + tooltip; re-sort on every data refresh; dates display short ("Oct 9, 5:06p") but sort by real time | — | Fixes overflow (inline span can't clip, equal forced widths) and sort (defaultSort applied only on first render) |
| Side cards: flat reference, the Glance look as-is, no action buttons. Center cards: same box + priority left edge, "updated Xago", hover Done/hide/fullscreen, unseen dot | Same look everywhere; darker side background | Distinction through behaviour and signals, keeps the Glance look |
| Side cards drop priority, Now promotion, Done/Completed, updated badge, hide. Keep fullscreen, stale, Broken | Allow hide | Permanent means non-dismissable; stale/broken must still show |
| New types `calendar` (side-allowed), `bookmarks` (side-allowed); list styles; media restyle | group/tabs, monitor, clock | Tabs hide content; monitor ≈ list with dots; clock adds nothing |
| Calendar data: `{ events: [{ title, start, end?, allDay?, location?, link?, color? }], days?: 7 }`; ISO with offset, shown in browser tz; mini month grid with event dots + N-day agenda grouped by day, today highlighted | Glance's event-less calendar | Glance's calendar has no events |
| Calendar fetching, filters, LLM pre-processing = agent job writing `data.json` | Tickdeck fetches gcal | Tickdeck never fetches |
| Bookmarks data: `{ groups: [{ title?, color?, links: [{ title, url, description?, icon? }] }] }`; icon = emoji only; group colour tints title | Icon CDN | Copy of Glance minus CDN |
| List `style: rows \| detailed` in `card.json`; `detailed` adds optional per-item `meta` | `cards` style | Media `row` already covers image cards |
| Media: Glance videos-grid look (16:9 thumb, 2-line title from `caption`, muted `meta`); layouts `grid \| single \| row`; thumbnails only, click opens link | Embedded video player | CSP/security cost; Glance doesn't embed either |
| Header: keep search + All/Alerts/Cards filter + status dots, restyled; fix dots that get no colour | Drop filter; Glance-minimal | Cheap and already built |
| Mobile: keep existing stacking (center, left, right), Glance styling | Glance bottom-nav tabs; desktop only | Mobile was cut for v1 |
| Keep list `links[≤5]`, hidden popover, desktop notifications, Now zone | Cut them | Small, built, tested; cutting costs work |
| Static HTML mockup with made-up data, private artifact, approved before React work | Build directly | Cheapest test of "still looks boring" |
| Build order: Rename → Mockup → Visual port → Side/center + table → Types; repo folder rename + `git worktree repair` + `projects/README.md` last | — | Rename touches everything; folder move breaks worktree paths |

## Design

| # | Part | Scope | Boundary / gate |
|---|---|---|---|
| A | Rename | All names above; git remote → new URL; folder move last | Mechanical, one commit, `npm run validate` green |
| M | Mockup | One static page. Left: calendar, kpi. Center: Now zone (1 card), alert strip, email table (narrow From, fill Subject), detailed list, media grid, Completed collapsed. Right: bookmarks, markdown. Header: search, filter, dots | Owner approval gates B |
| B | Visual port | New CSS tree mirroring Glance: `main.css` (font-face + derived tokens from ~8 inputs), `site.css` (page, header, columns 300/flex/300, 23px gap), `utils.css` (truncate, clamp, visited-link colour, colour helpers), `widgets.css` (card frame: uppercase 14px title outside box, box 1% lighter than page, 4% border, hard bottom shadow), per-type `types/<type>/*.css`. Remove existing `theme/` CSS + theme toggle | UI only; data contract untouched; screenshot diff against mockup |
| C | Side/center + table | Contract: side rejects table/list. Snapshot computation: sides never get priority/Now/Done/Completed. UI: side frame has no actions/badge/hide. Table width hints, clipping, re-sort, date display/sort | Contract change → plan mode, `gen:schemas`, changeset, ADR |
| D | Types | `calendar`, `bookmarks`, list `style` + `meta`, media `meta` + `row` + restyle | Each type self-contained under `src/contract/types/` + `ui/src/types/<type>/` |

**Failure modes**

| Case | Behaviour |
|---|---|
| Table/list placed in a side column | Broken, with reason |
| Calendar event with a bad date | Broken (validation) |
| Side card stale | Stale treatment; never hidden |
| Font file missing | Falls back to system monospace |

**Verification:** `npm run validate` per step; `npm run test:smoke` for UI steps; B checked against the approved mockup screenshot; regression tests for table overflow, re-sort and side reject; status-dot colour test.

## Non-goals

- Tickdeck fetches nothing: no gcal, RSS or markets. Agents write data files.
- No theme picker and no light mode.
- No Glance widgets that need network fetches. No group/tabs, monitor or clock.
- No drag and drop. No login/auth.
- No embedded video playback.
- No data migration from the old data dir.
- No Glance mobile bottom nav.

## Open risks

| Risk | Cheapest test |
|---|---|
| Looks flat even in Glance style with real data | Mockup (step M) |
| Full CSS rewrite regresses existing type layouts | Smoke tests + per-type screenshots during B |
| JetBrains Mono license obligations | Ship OFL text next to the font; check in verify-tarball |
| Card contract change invalidates owner's existing cards | Accepted (pre-1.0); owner rewrites cards |
| Folder rename breaks worktree/tooling paths | Do it last; `git worktree repair`; re-run validate |
