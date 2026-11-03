---
status: done
summary: 9 tasks - registry sides rule and validation, permanent snapshot/server/frame behaviour, four table fixes (truncate, widths, re-sort, dates), then ADR 0008, schemas, changeset, gates.
date: 2026-10-14
---
# Tasks: Side/center semantics and table fixes (SP04)
Source of truth: [PRD.md](PRD.md). Starts after SP03 (CSS hooks `card--side`/`card--center`, `col-w-*`, `.cell-truncate`, `.tbl-wrap`) is complete. 04 applies those classes and owns behaviour only; no new look. Each task ships its named regression tests.

| # | Task | Depends on | Status |
|---|---|---|---|
| 1 | Registry `sides` flag and side-rule validation | none | done |
| 2 | Permanent cards in snapshot and API type | 1 | done |
| 3 | Server refuses Done/Hide on side cards | 1, 2 | done |
| 4 | Frame and attention logic for permanent cards | 2 | done |
| 5 | Table contract: `width` and date warning | none | done |
| 6 | Table layout, truncation, widths | 5 | done |
| 7 | Table sort re-derivation | none | done |
| 8 | Short date display with real-time sort | 5, 7 | done |
| 9 | ADR 0008, schemas, changeset, gates | 1-8 | done |

## Task 1 — Registry `sides` flag and side-rule validation
What it is / what it means: One registry flag decides where a type may render, so ingest and CLI `validate` fail identically (R1, D1, D2, D3).
What changes at a high level: Every registry entry declares `sides` (`table`, `list` deny; `markdown`, `kpi`, `media` allow); `sidesAllowed()` exposed; mandatory via type constraint so SP05 must declare its types. `validateFolder` checks it right after the registered-type check, before data validation, yielding new broken reason `side-not-allowed` with the PRD message. Left/right `priority` yields an "ignored in left/right columns" warning, not an error. Card renders Broken, never moved.
Done when: `side-rule.test.ts` (deny/allow, priority warning, exhaustiveness), `ingest-side-reject.test.ts`, `validate-side-reject.test.ts` pass; CLI exits non-zero with the message.

## Task 2 — Permanent cards in snapshot and API type
What it is / what it means: Side cards are permanent reference with none of the work lifecycle (R2, R3, D4, D6).
What changes at a high level: `ViewCard` gains `permanent` (column is not center). Snapshot emits priority 2, `collapsed` false, and always places permanent cards in their column: skips hidden, acks, Now, collapse logic; never enters `completed`. Existing acks/hidden entries are ignored, not purged. Stale, Broken, `no-data`, fullscreen unaffected.
Done when: `snapshot-permanent.test.ts` passes (not in Now/completed/hidden, `collapsed:false`, `permanent:true`, stale ack ignored, stale state still works).

## Task 3 — Server refuses Done/Hide on side cards
What it is / what it means: Defence in depth for the UI rule (R5, D5).
What changes at a high level: New error code `PERMANENT_CARD`; Done and Hide mutations on a side card return 400 with it. DELETE variants still work to clear leftovers from before a card moved.
Done when: `mutations-permanent.test.ts` passes (Done/Hide 400, DELETE ok).

## Task 4 — Frame and attention logic for permanent cards
What it is / what it means: Side cards look and behave as reference, not tasks (R4).
What changes at a high level: `CardFrame` renders `card--side`/`card--center` classes and a `data-permanent` attribute; for permanent cards omits Done, Hide, collapse, priority marker and unseen dot; keeps Fullscreen. Attention/seen logic skips permanent cards. No CSS here.
Done when: `card-frame.test.tsx` passes (no Done/Hide/unseen, Fullscreen kept); kpi/markdown/media in a side column render and go stale.

## Task 5 — Table contract: `width` and date warning
What it is / what it means: Contract support for column width hints and non-ISO date cells (R7, R9, D10).
What changes at a high level: Column object schema gains optional `width` (`xs|s|m|l|fill`). For a column with explicit `sort:'date'`, each non-empty non-ISO cell emits a warning at the cell path ("date column needs ISO 8601; cell shown raw and sorted last"); card stays OK. Inferred date columns unchanged.
Done when: `tests/contract/table.test.ts` covers width enum and warning-not-error; templates for table updated if they show columns.

## Task 6 — Table layout, truncation, widths
What it is / what it means: Cells never spill into neighbours; columns size by content (R6, R7, D7, D8).
What changes at a high level: Drop fixed layout in compact and fullscreen. Compact cell bodies wrap in `.cell-truncate` with full text as `title` (links keep anchor inside); fullscreen wraps. Apply `col-w-<key>` to `th` and `td`. If no column declares `fill`, the text column with the longest average cell length becomes implicit fill. CSS values come from SP03 (starting 4/7/11/18rem).
Done when: `table-overflow.test.tsx` passes (truncate class + title, not fixed layout, width classes, implicit fill); narrow `From` + `fill` Subject check works.

## Task 7 — Table sort re-derivation
What it is / what it means: Sorting reflects current data and agent defaults (R8, D9).
What changes at a high level: Split user sort (undefined = untouched) from effective sort (user override else `defaultSort`); reset the override when `defaultSort` column/dir changes; third header click returns to default. Refreshed rows re-sort through the existing memo.
Done when: `table-resort.test.tsx` passes (rerender re-orders; user click persists until `defaultSort` changes).

## Task 8 — Short date display with real-time sort
What it is / what it means: Readable dates that sort by instant (R9, D10, D11).
What changes at a high level: Pure `formatDateCell` (time-bearing `Oct 9, 5:06p` in browser tz, date-only `Oct 9`, year when not current) applied to parseable cells in date columns, full localized timestamp as `title`. Unparseable cells, including bad cells in an explicit date column, render raw and sort last. Sort/filter/search keep the raw ISO.
Done when: `table-logic.test.ts` covers `formatDateCell`, instant-vs-string sort, raw-and-last for non-ISO.

## Task 9 — ADR 0008, schemas, changeset, gates
What it is / what it means: Release hygiene for a contract change (PRD ADR and Gates).
What changes at a high level: ADR 0008 `side-center-semantics` (allow/deny flag, reject-not-move, priority ignored); regenerate and commit `schemas/`; add changeset; update reference docs for `width`, `permanent`, `side-not-allowed`, `PERMANENT_CARD`.
Done when: `npm run gen:schemas` leaves no diff, `npm run validate` and `npm run test:smoke` pass.

## Owner steps
Rewrite existing table/list cards currently in side columns; they go Broken after this lands (accepted risk, pre-1.0).
