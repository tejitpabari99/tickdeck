---
status: draft
summary: 12 tasks — shared view/colour plumbing, calendar + bookmarks types, list/media extensions, renderers, docs/ADR 0009, final verification.
date: 2026-10-14
---
# Tasks: New and extended card types (SP05)
Source of truth: docs/agent_files/tickdeck-redesign-20261014-1700/05-types/PRD.md. Requires SP03 (CSS tree, hooks) and SP04 (registry `sides` flag, `ViewCard.permanent`) complete. No new runtime deps; dates via `Intl` only.

| # | Task | Depends on | Status |
|---|---|---|---|
| 1 | Shared plumbing: `colorSchema`, registry `view`, `ViewCard.style` | — | todo |
| 2 | Calendar contract, summary, template, registry entry | 1 | todo |
| 3 | Bookmarks contract, summary, template, registry entry | 1 | todo |
| 4 | List `style`/`meta` and media `meta`/`row` contract + templates | 1 | todo |
| 5 | Schemas generation and contract tests | 2, 3, 4 | todo |
| 6 | Calendar pure logic (month grid, agenda, day keys) | 2 | todo |
| 7 | Calendar renderer, CSS, registration | 6 | todo |
| 8 | Bookmarks renderer, CSS, registration | 3 | todo |
| 9 | List `detailed` renderer | 4 | todo |
| 10 | Media restyle, `row` layout, keyboard access | 4 | todo |
| 11 | Docs, ADR 0009, changeset | 5, 7, 8, 9, 10 | todo |
| 12 | Final verification | 11 | todo |

## Task 1 — Shared plumbing
What it is / what it means: the small cross-cutting pieces both new types and list rely on (PRD Architecture, Decisions 1, 5; resolved items on `view`/`style`).
What changes at a high level: add the closed-grammar `colorSchema` to the shared formats; give registry entries an optional per-type `view` zod; folder validation runs it after the type check and reports `schema-invalid` with path `style`; `ViewCard` gains optional `style` (one additive line in 04's file); public exports updated.
Done when: a card with an invalid `style` on a type with a `view` schema is Broken with the right path; types without `view` are unaffected; colour grammar rejects anything outside token names or "H S L".

## Task 2 — Calendar contract
What it is / what it means: the `calendar` type's data contract (R1, Decision 3, 4, 10, 11).
What changes at a high level: event schema with title/start/end/allDay/location/link/colour; date rules (RFC 3339, date-only only with `allDay`, `end >= start`, errors on `start`/`end` paths); `events` max 500, no `days`; summary "Title (+N more)" or empty; template; registry entry with `sides: 'allow'`, modes column/now/fullscreen; public exports.
Done when: valid events parse, `"Oct 5"` and end-before-start are schema-invalid, summary behaves per spec, template validates.

## Task 3 — Bookmarks contract
What it is / what it means: the `bookmarks` data contract (R2, Decision 6).
What changes at a high level: group/link schemas with limits, `linkSchema` URLs, `icon` ≤8 chars refused when it has a scheme or `/`; summary "N links"; template; registry entry `sides: 'allow'`; exports.
Done when: `icon: "https://x/y.png"` rejected, summary correct, template validates, type valid in a side column.

## Task 4 — List and media contract extensions
What it is / what it means: contract-side changes for R3 and R4 (Decisions 1, 2, 7).
What changes at a high level: list item `meta` (≤200); list registry entry gains `view` (`style` rows|detailed), stays `sides: 'deny'`; media item `meta`; media `layout` gains `row`, staying in data.json; list and media templates get `detailed`/`meta`/`row` examples; summaries unchanged.
Done when: `style: cards` is Broken, `meta` accepted in both list styles, existing list/media cards still validate, list in a side column still `side-not-allowed`.

## Task 5 — Schemas and contract tests
What it is / what it means: lock the contract (Acceptance 2, 3, 4, 5, 8; Tests).
What changes at a high level: run `gen:schemas` and commit output; add contract tests for schemas, dates, colour, icon, summaries, view validation, side allowance and registry exhaustiveness; templates-schemas test covers new templates.
Done when: re-running `gen:schemas` yields no diff, contract tests and templates test pass, `tickdeck validate` exits non-zero on bad calendar data.

## Task 6 — Calendar logic
What it is / what it means: pure, DOM-free date logic (Architecture algorithm, R1 Dates/Display tz, Decision 9).
What changes at a high level: day keys via `Intl` with injectable tz; timed events spanning local days (midnight-end rule, multi-day labels); all-day read literally with inclusive end; sorted per-day index; 42-cell month with locale week start (`getWeekInfo` with Monday fallback); `buildAgenda(selectedKey)`; NaN guards; logic tests incl. DST edges, week-start both paths, `Pacific/Kiritimati` vs `America/Los_Angeles`.
Done when: logic tests pass without a DOM and all-day events keep their date across zones.

## Task 7 — Calendar renderer
What it is / what it means: calendar body per R1 and Acceptance 1, 1b, 7.
What changes at a high level: grid with weekday header, muted out-of-month days, up to 3 dots, today and selected highlights, prev/next/today controls (local state, reset on refresh); agenda for the selected day (heading, time or "All day", linked title, location, colour bar, dimmed finished events, "No events"); click-day selection, UI-local and not persisted; midnight rollover via `useNow`; fullscreen/Now same body; styles from tokens and SP03 hooks only; UI registration and type union updated; body tests including day-click.
Done when: body tests pass and no hex colours appear in the new CSS.

## Task 8 — Bookmarks renderer
What it is / what it means: bookmarks body per R2 and the resolved fullscreen item.
What changes at a high level: tinted group titles, links via shared `CardLink` with visited styling, icon left, muted description, untitled group = separator; header search via `searchText`; fullscreen multi-column wrap; CSS and UI registration; body test.
Done when: body test passes and search filters by title/description/url.

## Task 9 — List detailed renderer
What it is / what it means: R3 rendering.
What changes at a high level: `style` from the card drives `.list--rows|detailed`; detailed shows 2-line title clamp, muted ellipsised `meta` line, muted subtitle; `rows` ignores `meta`; checkbox, due, links and action unchanged in both.
Done when: detailed test shows the meta line, default look and existing list tests unchanged.

## Task 10 — Media restyle and row layout
What it is / what it means: R4 and the resolved keyboard-access item.
What changes at a high level: caption becomes a 2-line-clamped title with full-text `title` attr; muted `meta`; 16:9 cover thumbnails; `row` layout with horizontal scroll-snap and fixed card width, scroll container `tabindex="0"` with `role="region"` and an `aria-label` including the card title; no `<video>`/iframe; layout regression test asserting the a11y attributes.
Done when: `media-layouts` test passes for grid/single/row and the a11y assertions hold.

## Task 11 — Docs, ADR, changeset
What it is / what it means: documentation duties for contract changes (conventions 4, 7).
What changes at a high level: SKILL.md and card-schema reference gain calendar/bookmarks sections and state: write events for at least the visible month, all-day semantics (literal, inclusive end), `meta` is detailed-only, card.json vs data.json field rule and the accepted style/layout inconsistency; ADR 0009 records decisions; changeset added.
Done when: docs match the contract and the ADR/changeset exist.

## Task 12 — Final verification
What it is / what it means: acceptance gate (Acceptance 8).
What changes at a high level: run `npm run validate` and `npm run test:smoke`, adding a smoke check for the media `row` container's tabindex and label; confirm `package.json` has no new runtime deps and schemas show no diff.
Done when: both commands are green and acceptance criteria 1-8 are covered.

Owner steps: none. After this SP, 01's final folder-move task runs.
