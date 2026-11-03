---
status: done
summary: 9 tasks to rewrite UI CSS on Glance's file split, single Mocha theme, bundled JetBrains Mono, card frame + hooks, header/dot fix, NOTICE, verification.
date: 2026-10-14
---
# Tasks: Visual port (SP03)
Source of truth: [PRD.md](PRD.md). Precondition for the whole sub-project: 01 rename complete and owner has approved the 02 mockup (recorded "approved <date>"). Token values and spacing come from the 02 PRD; this sub-project implements them, it does not redefine them. Old CSS stays until its replacement exists (Task 7 deletes it) so the app never breaks mid-way.

| # | Task | Depends on | Status |
|---|------|-----------|--------|
| 1 | Bundle font and licence | 01 done, 02 approved | done |
| 2 | Foundation styles: tokens, page, utilities | 1 | done |
| 3 | Card frame, side/center looks, hooks | 2 | done |
| 4 | Type styles and hook placeholders | 3 | done |
| 5 | Header restyle, dot fix, theme removal | 3 | done |
| 6 | Mobile layout and motion polish | 4, 5 | done |
| 7 | Delete old CSS, re-point tests, enforce inputs-only colour | 6 | done |
| 8 | NOTICE, README, ADR, changeset | 7 | done |
| 9 | Full validation and screenshot sign-off prep | 8 | done |

## Task 1 — Bundle font and licence
What it is: JetBrains Mono 400 served locally so the UI is offline-capable (R3, Decision 5).
What changes at a high level: add the Regular woff2 and `OFL.txt` (copyright preserved) under the UI assets fonts folder; add a verbatim `OFL.txt` copy in `ui/public/fonts/`; extend the tarball verification's required list with the font and licence. Subset to Latin only if the file is large (deferred otherwise). No new dependency.
Done when: files exist in repo; after a build, the woff2 is emitted into `ui/dist/assets` and the licence into `dist/ui/fonts`; `npm run verify-tarball` lists and passes both. Owner supplies the woff2 if the network is restricted.

## Task 2 — Foundation styles: tokens, page, utilities
What it is: the root of the new `ui/src/styles/` tree (R1, R3, R8, R12, Decisions 1-2).
What changes at a high level: create `main.css` (font-face, the ~8 colour inputs, derived tokens incl. `--prio-*`/`--unseen`/`--stale`, layout tokens, type and spacing scale per the 02 PRD, `color-scheme: dark`, weight-400 reset, 10px root/13px base), `site.css` (html/body, page, columns, Now zone, Completed, alert strip, scrollbars, `::selection`, `:focus-visible`), and `utils.css` (truncate, clamp-2, visited arrow, separators, thumbnail, text/size/colour helpers). Wire import order centrally in `main.tsx`, alongside the old CSS for now.
Done when: new files load in the app in the specified order; no hard-coded hex or colour literals outside the input block; computed values spot-check against the 02 derived table.

## Task 3 — Card frame, side/center looks, hooks
What it is: `widgets.css` plus frame markup hooks (R4, R5, R10, Decision 6, hooks contract).
What changes at a high level: Glance-style frame (outside uppercase title, +1% box, +4% border, 5px radius, hard 3px bottom shadow); class/data hooks on the card frame component only: `.card`, `card--side`/`card--center` from the column prop, `data-permanent`, priority classes, header/title/meta/actions/unseen-dot/stale-tag, state classes. Center shows priority edge, "updated Xago" (muted, `•` separated), unseen dot, hover actions; side is flat and CSS hides actions/dot/updated. Restyle chip, fullscreen dialog, server-down screen, toasts. Relative time reuses the existing hook; add refresh on `visibilitychange` if missing.
Done when: both looks render correctly from the column prop; hook names match the PRD contract exactly; no behaviour changes.

## Task 4 — Type styles and hook placeholders
What it is: per-type styles under `styles/types/` (R7, Decision on intermediate breakage).
What changes at a high level: restyle kpi, list, markdown, media, table (visual only). Ship the table classes 04 will apply: `col-w-xs|s|m|l|fill`, `.cell-truncate`, `.tbl-wrap`, `--tbl-auto-max`, using 04's starting widths (retune once the font is in). Provide empty/placeholder rules for `.list--rows|detailed`, `.meta-line`, `.media-grid`, `.media-row` so 05 only fills them. Add the single import line per type in central order.
Done when: all five types look like the mockup; table classes work when manually applied; placeholders exist; no behaviour or contract changes.

## Task 5 — Header restyle, dot fix, theme removal
What it is: header per R6, dot bug fix (Decision 8), and removal of light mode/toggle (R2, Decision 4).
What changes at a high level: Glance-style header (logo, date, search, All/Alerts/Cards segmented control, status dots with soft glow ring, Hidden popover and search dropdown restyled with popover tokens). Dots use the colour variable directly (no `hsl()` wrapper). Remove per the PRD removal list: `theme.ts`, its test, header toggle and the server-down toggle branch, `THEME_KEY`, `initTheme`, `data-theme` attribute and the pre-paint script in `index.html`. Old stored key is ignored. Add a regression test that fails on the old `hsl(var(--positive))` form and asserts a non-transparent computed dot colour.
Done when: no toggle anywhere; dots visibly coloured for ok/error; new test fails against the old form; re-grep of `theme` shows only intended leftovers.

## Task 6 — Mobile layout and motion polish
What it is: `mobile.css` and motion rules (R9, R12).
What changes at a high level: imported last; below 1200px stack center, left, right with 16px gutters; no horizontal scroll at 360px; table scrolls inside its card. Add page entrance fade and staggered list reveal; disable all animation under `prefers-reduced-motion`. Keep the 1200px literal in one commented place with the breakpoint test helper.
Done when: 360px has no horizontal scroll; reduced-motion disables animations; stacking order correct.

## Task 7 — Delete old CSS, re-point tests, enforce inputs-only colour
What it is: cutover and guardrails (Acceptance 1-3, old-to-new mapping).
What changes at a high level: delete `ui/src/theme/` and every per-component `*.css`, plus their imports; map any residual rules per the PRD mapping table. Re-point `tokens.test.ts` and the breakpoint helper to the new files. Add a test asserting no hex/hsl literals outside the `main.css` inputs. Run a reskin demo (change only `--bgh`) to confirm everything recolours.
Done when: criteria 1-3 hold (`grep -ri "data-theme\|prefers-color-scheme\|THEME_KEY\|initTheme" ui` returns nothing); `npm test` passes.

## Task 8 — NOTICE, README, ADR, changeset
What it is: licence credit and project paperwork (R11, Decision 3, Acceptance 5, 10).
What changes at a high level: add root `NOTICE` crediting Glance (AGPL-3.0) for design values/structure, stating no verbatim CSS and repo stays MIT; link from README; add to package `files`; confirm it appears in the tarball check. Add ADR 0007 (single theme, Glance-derived CSS, NOTICE) and a changeset.
Done when: NOTICE is in the packed tarball; ADR and changeset present; README links NOTICE.

## Task 9 — Full validation and screenshot sign-off prep
What it is: final verification (Decision 9, Acceptance 4, 7-9).
What changes at a high level: update smoke tests (no toggle, dots coloured, font served locally with no external requests); run `npm run validate` and `npm run test:smoke`; capture screenshots at 1280 and 360px next to the in-repo `02-mockup/mockup.html` for comparison; confirm weight 400 everywhere and side/center behaviour per criterion 7.
Done when: validate and smoke pass; screenshots saved for owner review.

## Owner steps
- Approve the 02 mockup before Task 1 starts (record "approved <date>").
- Supply the JetBrains Mono woff2 if the network is restricted.
- Final eyeball of Task 9 screenshots against the mockup (Acceptance 9 sign-off).
