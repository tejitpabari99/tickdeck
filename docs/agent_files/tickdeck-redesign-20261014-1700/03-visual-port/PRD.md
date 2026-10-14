---
status: draft
summary: Rewrite all UI CSS from scratch in Glance's file split (main/site/utils/widgets/mobile + per-type), Catppuccin Mocha only, JetBrains Mono bundled, side-vs-center card look, restyled header with status-dot fix, NOTICE; reskin = change ~6 inputs.
date: 2026-10-14
---
# PRD: Visual port (SP03)
Repo/branch: crontick-dashboard (→ tickdeck) / `initial-brainstorming` · Depends on: 01 rename, 02 mockup (owner-approved) · Owns: `ui/src/styles/**` (new), `ui/src/theme/**` + all component `*.css` (delete), `ui/src/assets/fonts/**`, `ui/src/lib/theme.ts` (delete), `ui/src/main.tsx` + `ui/index.html` (CSS/theme bits), `ui/src/zones/Header.tsx` (restyle, remove toggle), `ui/src/frame/CardFrame.tsx` (class/data hooks only), `NOTICE`, `scripts/verify-tarball.mjs` (font entries), CSS-touching `ui/tests/**` + `tests/smoke`.

## TL;DR
Replace ~609 lines of tokenised, dual-theme CSS with a fresh Glance-shaped stylesheet set: 6-8 HSL/colour inputs in `main.css` drive every colour via `calc()`. One theme (Catppuccin Mocha), no toggle. JetBrains Mono 400 ships as a local woff2 + OFL text. Cards get the Glance frame (outside uppercase title, +1% box, +4% border, hard bottom shadow); the UI picks side vs center look from the column it already knows. Header restyled, status dots fixed + regression test. Port implements the 02 mockup 1:1; it does not redefine its tokens.

## Problem
- Current look is flat; 2 themes + toggle cost CSS and code for a feature the owner dropped.
- Status dots uncoloured: `tokens.css:13` defines `--positive` as full `hsl()`, `header.css:12` wraps it in `hsl(var(--positive))` → invalid [verified: `ui/src/theme/tokens.css:13`, `ui/src/zones/header.css:12`].
- Theme bits spread: `ui/src/lib/theme.ts`, `main.tsx:4-8`, `Header.tsx:4,13`, `constants/storage.ts:2` (`THEME_KEY`), pre-paint script `ui/index.html:9-20`, `ui/tests/theme.test.ts` [verified: grep].
- Reskinning today means editing many files; goal is changing a few inputs.

## Goals / Non-Goals
Goals: look equals approved mockup; reskin via inputs only; no light mode/toggle anywhere; font offline and in tarball; Glance credited; dot bug fixed with test; CSS hooks documented for 04/05.
Non-goals: behaviour (side-card actions, snapshot flag, contract rejecting table/list on sides → 04); table width hints/truncation logic/re-sort → 04; list `style`/`meta`, media `meta`/`row`, calendar, bookmarks → 05 (03 only gives the file slots and utility classes); mobile redesign (stacking kept, restyled); new runtime deps.

## Requirements
| # | Requirement |
|---|---|
| R1 | Token values, derived formulas, spacing/type scale = 02 PRD "Token table"/"Spacing" (reference, not copied here). Inputs: `--bgh/--bgs/--bgl`, `--cm`, `--tsm`, `--color-primary/positive/negative`. Tickdeck extras (`--prio-*`, `--unseen`, `--stale`) derive from them; no hard-coded hex anywhere |
| R2 | Single dark theme; `color-scheme: dark`; remove `data-theme`, `prefers-color-scheme` blocks, pre-paint script, toggle UI, `THEME_KEY`, `theme.ts`, `theme.test.ts`. Old stored key ignored (not migrated) |
| R3 | Font JetBrains Mono 400 woff2 local, `font-display: swap`, ligatures off, 10px root / 13px base, weight 400 only (`b,strong,th,h*` reset to 400; emphasis = text tier) |
| R4 | Card frame = 02 "Card frame anatomy". Title uppercase 14px, `letter-spacing:.04em`, outside box, 9px gap, `padding:0 18px`; box 15/17 padding, 5px radius, 3px hard bottom shadow |
| R5 | Side look (flat, no actions/edge/dot/updated) vs center look (3px priority edge, "updated Xago", unseen dot, hover Done/hide/fullscreen) chosen from the column prop; 04 later removes the side actions from the DOM, CSS hides them meanwhile |
| R6 | Header Glance-style: logo, date, search, All/Alerts/Cards segmented control, status dots with soft glow ring; dots use the colour var directly |
| R7 | Restyle kpi/list/markdown/media/table, alert strip, Now zone, Completed `<details>`, chips, fullscreen `<dialog>`, server-down screen, toasts, hidden popover, search dropdown — visual only |
| R8 | `utils.css` provides generic classes: `.truncate` (ellipsis), `.clamp-2`, `.visited-arrow` (visited-link colour), `.separator-list`, `.thumbnail`, `.text-*`/`.size-*`/`.color-*` helpers |
| R9 | `mobile.css`: `<1200px` stack center, left, right; 16px gutters; no horizontal scroll at 360px; table scrolls inside card |
| R10 | Relative time: reuse `ui/src/lib/relative-time.ts` (already 60s tick, paused when hidden) [verified: `relative-time.ts:3-30`]; add refresh on `visibilitychange` if missing |
| R11 | `NOTICE` at repo root crediting Glance (AGPL-3.0) for design values/structure; no verbatim CSS; README links NOTICE; added to package `files` |
| R12 | Page entrance fade, staggered list reveal, `::selection`, 5px scrollbars, `:focus-visible` outline; all disabled under `prefers-reduced-motion` |

## Architecture

### New CSS tree (`ui/src/styles/`) and import order in `main.tsx`
```
main.css      font-face + :root inputs + derived tokens + scale   (Glance main.css, 66 lines)
site.css      html/body, page, header, alert strip, columns, Now, Completed, scrollbars
utils.css     truncate, clamp-2, visited arrow, separators, thumbnail, size/colour helpers
widgets.css   .card frame, header row, side/center variants, states, chip, fullscreen
types/kpi.css list.css markdown.css media.css table.css   (05 adds calendar.css, bookmarks.css)
mobile.css    @media (max-width:1200px)   -- imported LAST
```
Import order: main → site → utils → widgets → types/* → mobile. One tree only, imported centrally in `main.tsx` (05 adds one import line per type). Breakpoint literal 1200px kept in one comment + `ui/tests/helpers/breakpoint.ts` assertion [verified: `tokens.test.ts:4`].

### Old → new mapping
| Old | New home |
|---|---|
| `theme/tokens.css`, `theme/themes.css` | `main.css` (themes.css deleted) |
| `theme/base.css` | `site.css` + `utils.css` |
| `zones/{header,alert-strip,columns,now-zone,completed,server-down}.css` | `site.css` (server-down, toasts: `widgets.css`) |
| `frame/{card-frame,chip,fullscreen,card-link}.css` | `widgets.css` (card-link → `utils.css` visited arrow) |
| `types/{kpi,list,markdown,media,table}/*.css`, `types/shared/shared.css` | `types/*.css`; shared → `utils.css` |
| layout tokens (`--col-side`, `--h-S/M/L`, `--chip-h`) | `main.css`; `tokens.test.ts` re-pointed [verified: `tokens.test.ts:9-16`] |

### CSS hooks contract (stable names; 04/05 toggle these, never restyle)
| Hook | Set by | Meaning |
|---|---|---|
| `.card` + `.card--side` / `.card--center` | 03 (from column prop) | look variant |
| `.prio-high\|normal\|low` | 03 | center left-edge colour |
| `.card-header`, `.card-title`, `.card-meta`, `.card-actions`, `.unseen-dot`, `.stale-tag` | 03 | frame parts |
| `.card--stale`, `.card--broken`, `.card--empty` | 03 | states |
| `[data-snapshot="true"]` on `.card` | 04 (flag semantics) | 03 ships style: no actions, no "updated", subdued edge |
| `.card-actions[hidden]` | 04 | side cards omit actions; CSS also hides under `.card--side` |
| `.col-w-xs\|s\|m\|l\|fill` on `<col>`/`<th>`, `.cell-truncate` | 04 (table) | 03 supplies widths + ellipsis rules, 04 applies classes |
| `.list--rows\|detailed`, `.meta-line`, `.media-grid`, `.media-row` | 05 | 03 provides empty/placeholder rules only; 05 fills |
| utilities in R8 | anyone | shared |

### Font packaging
`ui/src/assets/fonts/JetBrainsMono-Regular.woff2` + `OFL.txt` (same dir; copyright line preserved). `main.css` references via relative `url()` so vite hashes/emits it to `ui/dist/assets` → `copy-ui` → `dist/ui` → already in tarball via `"files": ["dist"]`. `OFL.txt` is not bundled by vite: add `ui/public/fonts/OFL.txt` (copied verbatim to `dist/ui/fonts/`) and add both font and licence to `required` in `scripts/verify-tarball.mjs` [verified: `package.json` files list, `verify-tarball.mjs:22-29`]. Not a dependency; file in repo. Subset (Latin) if >~100KB.

### Theme-toggle removal list
`ui/src/lib/theme.ts`; `ui/tests/theme.test.ts`; `Header.tsx` import (`:4`), button, and the server-down "theme toggle" branch (`:13`); `THEME_KEY` in `constants/storage.ts`; `main.tsx` `initTheme` (`:4`) and `theme/*.css` imports (`:6-8`); `ui/index.html` `data-theme` attr (`:2`) + pre-paint script (`:9-20`); `ServerDown` toggle if present. Server/config: none found [verified: `grep theme src` → 0 matches]. Re-grep `theme` before merge.

### Relative-time / dots
`CardFrame.tsx` already uses `formatRelative`/`useNow` [verified: `CardFrame.tsx:3`]; 03 only restyles it (muted, `•` separated) in `.card-meta`. Status dots: `.dot--ok{background:var(--color-positive)}` etc. + glow `box-shadow:0 0 0 3px color-mix(...)`.

## Decisions
| # | Decision | Choice | Alternatives | Why |
|---|---|---|---|---|
| 1 | CSS strategy | Rewrite from scratch, Glance file split | Re-skin existing tokens | Owner choice; 609 lines is cheap, reskin = few inputs |
| 2 | Tree location | One central `ui/src/styles/`, central imports | Per-component css beside TSX | Mirrors Glance; one place for 04/05 to extend |
| 3 | Licence | Re-implement values/structure; MIT stays; `NOTICE` credits Glance | Paste Glance CSS (forces AGPL) | Brief constraint. 02 PRD says SP01 owns NOTICE; brief assigns 03, so **03 owns it** |
| 4 | Theme | Mocha only, no toggle, old key ignored | Keep light, migrate key | Owner decision; dead key harmless |
| 5 | Font | woff2 in repo, vite-hashed + licence in `public/` | CDN; npm `@fontsource` | Offline, no new dep |
| 6 | Side/center | Class from column prop; hooks for 04 | Wait for 04 snapshot flag | 03 stays visually complete; 04 owns behaviour |
| 7 | Relative time | Reuse existing hook | New component | Already 60s tick + pause |
| 8 | Dot fix | Use colour var directly + test | Keep wrapper, split tokens | Single colour token format |
| 9 | Verification | Screenshot diff vs mockup at 1280 and 360 | Pixel-exact CI | Owner-eyeball; fonts differ in CI |

## Manual steps (owner)
1. Approve mockup Artifact (02) **before 03 starts**; record "approved <date>".
2. Final eyeball of 03 screenshots vs mockup.
3. Supply/confirm JetBrains Mono woff2 download if network-restricted.

## Risks / Open Questions
| Item | Tag |
|---|---|
| Uppercase title (Glance has `.uppercase` on h2, `widget-base.html:7`; header size `widgets.css:68`) | [RESOLVED: uppercase + .04em, per 02] |
| NOTICE owner conflict 02 vs brief | [RESOLVED: 03] |
| Old CSS deleted before 04/05 need their hooks → intermediate breakage | [RESOLVED: 03 ships empty per-type placeholders + hooks] |
| `[data-snapshot]` flag name finalised by 04 | [OPEN: 04 may rename; 03 uses the name above, one grep to change] |
| Header `Hidden (n)` popover, search dropdown restyle depth | [RESOLVED: restyle with popover tokens] |
| Screenshot compare needs mockup HTML local (Artifact private) | [OPEN: use `02-mockup/mockup.html` in repo as reference] |
| Subset font to Latin? | [DEFERRED] |
| Old `crontick-dashboard.theme` key cleanup | [DEFERRED: harmless] |

## Acceptance Criteria
1. No `ui/src/theme/`, no per-component `*.css`; `ui/src/styles/` has main/site/utils/widgets/mobile + types/{kpi,list,markdown,media,table}.css.
2. `grep -ri "data-theme\|prefers-color-scheme\|THEME_KEY\|initTheme" ui` → 0 matches; no toggle in header.
3. Reskin demo: editing only `--bgh` (e.g. 240→20) in `main.css` recolours page, boxes, borders, text tiers; no other file touched. Test asserts no hex/hsl literals outside `main.css` inputs.
4. Font loads from the app origin (no network request to Google/CDN; devtools shows `.woff2` 200 local); `npm run verify-tarball` passes and lists woff2 + OFL.
5. `NOTICE` present, names Glance + licence, in tarball; repo stays MIT.
6. Status dots computed colour non-transparent for ok/error; new `ui/tests` regression test fails on the old `hsl(var(--positive))` form.
7. Computed values match 02 derived table (spot-check 5); weight 400 everywhere; side cards flat, center cards show edge, "updated", dot, hover actions.
8. `npm run validate` and `npm run test:smoke` pass (smoke updated: no toggle, dots coloured).
9. Screenshots at 1280 and 360px match approved mockup (owner sign-off); no horizontal scroll at 360px.
10. Changeset added; ADR in `docs/decisions/` (single theme + Glance-derived CSS + NOTICE).
