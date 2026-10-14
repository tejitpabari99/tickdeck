---
status: draft
summary: Side columns become permanent reference (no table/list, no priority/Now/Done/Completed/hide/unseen), enforced in the contract and snapshot; table cells truncate with tooltips, columns auto-size with optional width hints, tables re-sort on refresh, dates display short but sort by real time.
date: 2026-10-14
---
# PRD: Side/center semantics and table fixes (SP04)
Repo/branch: tickdeck / `initial-brainstorming` · Depends on: SP03 (CSS tree; this PRD only adds class hooks) · Owns: `src/contract/{registry,card-def,folder-validate}.ts`, `src/contract/types/table.ts`, `src/constants/error-codes.ts`, `src/compute/snapshot.ts`, `src/shared/api-types.ts`, `src/http/mutations.ts`, `ui/src/frame/CardFrame.tsx`, `ui/src/zones/{Columns,Completed}.tsx`, `ui/src/lib/attention.ts`, `ui/src/types/table/{logic.ts,TableBody.tsx}`, `templates/table/*`, `schemas/` (generated), ADR 0008, changeset, tests. **Shared with SP05:** `src/contract/registry.ts`, `schemas/*` (05 adds registry `view`, `ViewCard.style?`, the `view` check in `folder-validate.ts`). **Shared with SP03:** `ui/src/frame/CardFrame.tsx` (03 lands first: class hooks; 04 adds behaviour + `data-permanent`).

## TL;DR
Left/right = permanent reference, center = moving work. One registry flag (`sides: 'deny' | 'allow'` per type) drives rejection in `validateCardFolder`, so CLI `validate` and ingest fail identically with a new broken reason `side-not-allowed`. The snapshot marks side cards `permanent: true` and applies none of the work-lifecycle logic to them; the frame hides Done/Hide/unseen for them; the server refuses Done/Hide on them. Table: truncate-with-tooltip, content-sized columns with `width` hints, re-sort when data refreshes, short date display with real-time sort.

## Problem
- Side and center behave identically: a low-priority side card collapses to a chip, a high-priority one jumps to Now, either can be marked Done and vanish into Completed. [verified: src/compute/snapshot.ts:70,104 `collapsed: c.priority <= 1`; :171 Now promotion; :167 acks to Completed]
- Table cell text spills into the next column. Compact cell text sits in an inline `<span>` (inline elements cannot clip) [verified: ui/src/types/table/TableBody.tsx:72]; compact tables are `table-layout: fixed` so all columns get equal width [verified: ui/src/types/table/table.css:11].
- Email table sorts wrongly: sort state is `useState(defaultSort)`, read once on mount, so a later `defaultSort` change or a data refresh never re-applies it [verified: TableBody.tsx:115]. Non-ISO date strings parse to null and sort last [verified: logic.ts:52 `DATE_RE`]. No `defaultSort` means the agent's write order.

## Goals / Non-Goals
Goals: enforce side rules in contract + snapshot + frame + server; fix the four table defects; define the registry interface SP05 extends.
Non-goals: visual side/center distinction (SP03 CSS), new types / list `style` (SP05), table redesign beyond the four fixes, drag/resize, back-compat for old card data (pre-1.0).

## Requirements
| # | Requirement |
|---|---|
| R1 | Card with `layout.column` left/right and a type whose registry entry is `sides: 'deny'` (`table`, `list`) fails `validateCardFolder` with broken reason `side-not-allowed`, message `type "table" is not allowed in the left column: sides are permanent reference; use column "center" (or a kpi/markdown/media card)`. The same function backs ingest and CLI `validate`, so both agree. Card renders Broken with that message. Never moved silently |
| R2 | Side cards (`permanent: true`): effective priority is neutral (2) and `collapsed` is false; never in Now; never Done (existing acks ignored); never in `completed`; never hidden (existing `hidden` entry ignored); no unseen/"updated" badge |
| R3 | Side cards keep fullscreen, `staleAfter` stale state, Broken, and `no-data` |
| R4 | Frame: when `card.permanent`, render no Done, Hide or collapse button, no priority marker, no unseen dot. Fullscreen button stays |
| R5 | Server: `POST /api/cards/:id/done` and `PUT …/hidden` on a side card return 400 `PERMANENT_CARD`. `DELETE` variants still work (clears stale state left from before a card moved to a side) |
| R6 | Table: compact cells clip with ellipsis; full text in native `title` |
| R7 | Table: columns size by content; optional `width: 'xs'\|'s'\|'m'\|'l'\|'fill'` per column |
| R8 | Table: effective sort re-derived on every data refresh |
| R9 | Table: date columns display short, sort by real time; explicit `sort:'date'` columns require ISO strings |

## Architecture

### Side-rule registry interface (SP05 extends)
```ts
// src/contract/registry.ts
export interface TypeEntry { schema; summary; template;
  /** Where this type may render. 'deny' = center only. */
  sides: 'allow' | 'deny' }
// existing: table: {..., sides:'deny'}, list: {..., sides:'deny'}; markdown, kpi, media: 'allow'
export function sidesAllowed(type: string): boolean   // registry[type].sides === 'allow'
```
05 extends the entry with optional `view` (per-type card.json view zod) and `ViewCard.style?`; 04 adds neither. `as const satisfies Record<string, TypeEntry>` makes `sides` mandatory, so SP05 cannot add `calendar`/`bookmarks` without declaring it (both `'allow'`). Check lives in `validateFolder` right after the `isRegisteredType` check [verified: src/contract/folder-validate.ts:300-305], before data validation, so it fails even when data is absent. `BROKEN_REASONS` gains `'side-not-allowed'` [verified: src/constants/error-codes.ts:41].

### Priority on a side card
`priority` on a side card is **ignored with a warning** (`validateCardFolder` warnings, surfaced by `validate` and ingest warnings): `priority is ignored in left/right columns`. Snapshot forces neutral. Not rejected because priority is a valid field on the same type elsewhere and has no harm here, unlike table/list which cannot render correctly.

### Snapshot and API
- `ViewCard` gains `permanent: boolean` (= `column !== 'center'`) [src/shared/api-types.ts]. `priority` is emitted as 2 for permanent cards.
- `computeSnapshot`: for permanent cards skip hidden, ack, Now, `collapsed` branches (snapshot.ts:70,104,163-172) and always push into `columns[view.column]`.
- No change to `Completed` shape; side cards simply never enter it.

### Frame
`CardFrame` branches on `card.permanent` [verified: ui/src/frame/CardFrame.tsx:131 priority marker, :185 Done, :189 Hide]. `ui/src/lib/attention.ts` / seen logic skip permanent cards. The frame renders BOTH the class `card--side`|`card--center` (derived from column; SP03 styles off these) and the `data-permanent` attribute (this PRD's behaviour/test hook; no CSS here).

### Table contract delta
```ts
// src/contract/types/table.ts columnSchema object branch
width: z.enum(['xs', 's', 'm', 'l', 'fill']).optional(),
```
Plus superRefine: for a column with explicit `sort:'date'`, every non-empty cell text must be an ISO-8601 date or date-time string (`Date.parse` valid, matches `DATE_RE`); otherwise issue at `/rows/i/cells/j` "date column needs ISO 8601". Inferred date columns unchanged (>=80% rule).

### Table rendering
- Layout: `table-layout: auto; width: 100%` in compact and fullscreen (drop `.tbl--compact` fixed layout). Wide tables scroll inside `.tbl-wrap`. CSS for these rules lives in SP03's `ui/src/styles/types/table.css`; the values here are the spec and 03 may retune.
- Width mapping (class `col-w-<k>` on `th` and `td`, `width = min-width = max-width`):

| key | value |
|---|---|
| xs | 4rem |
| s | 7rem |
| m | 11rem |
| l | 18rem |
| fill | `width:100%; min-width:10rem; max-width:0` (absorbs the remaining width, truncates) |
| unset | auto, capped by `--tbl-auto-max: 24rem` |

- If no column declares `fill`, the text column with the longest average cell length becomes implicit `fill`.
- Truncation: each cell body is wrapped in `<span class="cell-truncate" title={fullText}>` (`display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap`) in compact mode. Fullscreen keeps wrapping (`overflow-wrap:anywhere`, table.css:13). `.cell-truncate` is the hook from SP03's CSS hook table (SP03 may restyle); the clipping properties are functional and must be kept. Link cells put the anchor inside the span.
- Sort pipeline: `userSort: SortState | null | undefined` (undefined = untouched). `effective = userSort !== undefined ? userSort : defaultSort`. A `useEffect` keyed on `defaultSort?.column/dir` resets `userSort` to undefined, so an agent changing `defaultSort` wins; user header clicks persist across refreshes with unchanged `defaultSort`. `sortRows` already runs in a `useMemo` over refreshed `rows` [verified: TableBody.tsx:~165], so every refresh re-sorts. `nextSort` third click returns to `undefined` (default), not `null`.
- Dates: pure `formatDateCell(iso, tz)` in `logic.ts`: time-bearing -> `Oct 9, 5:06p` (browser tz), date-only -> `Oct 9`; year shown when not the current year. Applied to cells in date-typed columns that parse; unparseable cells show raw. `title` = full localized timestamp. Sort/filter/search keep using the raw ISO.

### ADR
ADR 0008 `side-center-semantics` records the allow/deny registry flag, reject-not-move, and priority-ignored.

## Decisions
| # | Decision | Choice | Alternatives | Why |
|---|---|---|---|---|
| D1 | Side rule location | Registry `sides` flag checked in `validateFolder` | Hardcoded type list in ingest and CLI separately; UI-only check | One source for CLI + ingest; SP05 must declare per type |
| D2 | Offending card | Broken + reason | Silent move to center | Agents learn from the error; owner decision |
| D3 | `priority` on side | Ignored + warning | Reject; silent ignore | Harmless to render; warning still teaches |
| D4 | Flag name in snapshot | `permanent: boolean` on `ViewCard` | UI derives from `column` | Single meaning for frame, attention, SP03 selector |
| D5 | Server Done/Hide on side | 400 `PERMANENT_CARD`; DELETE still allowed | Allow and ignore; refuse all | Defence in depth; DELETE cleans leftovers |
| D6 | Existing acks/hidden on a card later moved to a side | Ignored by snapshot, not purged | Purge at ingest | Reversible if the card moves back; pruning handles the rest |
| D7 | Table layout | `auto` + width classes + implicit fill | Keep fixed; `<colgroup>` percent | Fixed forces equal widths; auto honours content |
| D8 | Clipping scope | Compact only; fullscreen wraps | Truncate always | Fullscreen has room; full text readable |
| D9 | Sort state | Derived: user override reset on `defaultSort` change | Re-key table on data change; always force defaultSort | Keeps manual sort across refreshes, still fixes stale default |
| D10 | Non-ISO in explicit date column | Contract error | Warning; best-effort parse | "ISO required" is rule; locale parsing is ambiguous |
| D11 | Date format | `Oct 9, 5:06p`, browser tz, year if not current | Relative ("2h ago"); 24h | Owner example |

## Risks / Open Questions
- [OPEN] D10 as hard error breaks a whole card for one bad cell; downgrade to warning if owner prefers lenient.
- [OPEN] Width px values (4/7/11/18rem) are guesses; SP03 may retune once JetBrains Mono at 13px is in (03's hook table is the contract for class names).
- [RESOLVED: ignored + warning] `priority` on side cards.
- [RESOLVED: 03 owns look] side flat vs center edge/badge visuals; this PRD ships only `data-permanent` and the behaviour.
- [DEFERRED] Per-card `alignment` of numeric columns; column resize by user.
- Risk: owner's existing table/list cards in side columns go Broken on upgrade (accepted, pre-1.0).
- Risk: implicit fill guess picks wrong column; mitigated by explicit `width`.

## Acceptance Criteria
Observable:
1. A table card with `column:"left"` shows Broken with the `side-not-allowed` message; `tickdeck validate` exits non-zero with the same message.
2. A kpi/markdown/media card in a side column renders; has no Done/Hide button and no unseen dot, still has Fullscreen; goes stale when `staleAfter` passes.
3. A side card with priority 5 and a cron window is not in Now; one with priority 0 is not collapsed.
4. A long Subject in a compact table shows an ellipsis and hover shows the full text; neighbouring columns are not overlapped; narrow `From` + `fill` Subject work.
5. Changing the data (new row order or new `defaultSort`) re-sorts without reload; ISO date column sorts by time and displays `Oct 9, 5:06p`.

Regression tests (named):
- `tests/contract/side-rule.test.ts`: table/list in left/right -> `side-not-allowed`; kpi in right ok; priority warning; registry exhaustiveness (every type declares `sides`).
- `tests/server/ingest-side-reject.test.ts`: ingest yields Broken entry with the reason.
- `tests/cli/validate-side-reject.test.ts`: CLI exit code + message.
- `tests/server/snapshot-permanent.test.ts`: side card never in Now / `completed` / `hidden`, `collapsed:false`, `permanent:true`, stale ack ignored.
- `tests/server/mutations-permanent.test.ts`: Done/Hide on side -> 400, DELETE ok.
- `ui/tests/card-frame.test.tsx`: permanent frame has no Done/Hide/unseen, keeps Fullscreen.
- `ui/tests/table-overflow.test.tsx`: compact cell has `.cell-truncate` with `title`; table not `table-layout: fixed`; `col-w-*` classes applied; implicit fill.
- `ui/tests/table-resort.test.tsx`: rerender with new rows/`defaultSort` re-orders; user click persists until `defaultSort` changes.
- `ui/tests/table-logic.test.ts`: `formatDateCell`, ISO date sort by instant not string, non-ISO explicit date rejected in `tests/contract/table.test.ts`.
- Gates: `npm run gen:schemas` diff committed, changeset, ADR 0008, `npm run validate`, `npm run test:smoke`.
