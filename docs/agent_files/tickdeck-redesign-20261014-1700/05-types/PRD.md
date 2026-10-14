---
status: draft
summary: Add calendar (month grid + agenda) and bookmarks types; list gains style rows|detailed + item meta; media gains meta, 2-line caption title and row layout. All side-allowed except list; view fields split card.json (style) vs data.json (media layout stays).
date: 2026-10-14
---
# PRD: New and extended card types (SP05)
Repo/branch: tickdeck / `initial-brainstorming` · Depends on: SP03 (CSS tree, utils, hooks), SP04 (registry `sides` flag) · Owns: `src/contract/types/{calendar,bookmarks,list,media}.ts`, `src/contract/formats.ts` (adds `colorSchema`), `ui/src/types/{calendar,bookmarks}/**`, `ui/src/types/{list,media}/*` (bodies/logic), `ui/src/styles/types/{calendar,bookmarks,list,media}.css`, `templates/{calendar,bookmarks,list,media}/*`, `src/skill/SKILL.md` + `docs/reference/card-schema.md` (type sections), `schemas/*` (generated), ADR 0009, changeset, tests. **Shared:** `src/contract/registry.ts`, `src/contract/card-def.ts`, `src/shared/api-types.ts` (04 owns; 05 adds one field), `schemas/*`, `ui/src/types/index.ts`, `ui/src/registry/registry.ts` (type union).

## TL;DR
Two new types and two extended ones, all as self-contained zod schema + summary fn + template + renderer. `calendar` = mini month grid with event dots + N-day agenda; `bookmarks` = Glance bookmark groups. `list` gets `style: rows|detailed` (card.json) and per-item `meta`; `media` gets `meta`, caption-as-title, and a horizontal `row` layout. Tickdeck still fetches nothing: agents write the events/links. New types register with `sides: 'allow'`; list stays `deny`.

## Problem
Sides (SP04) are for permanent reference but only kpi/markdown/media can go there; no agenda, no link collection. Center list/media look plain next to Glance's detailed list and video grid. Glance's own calendar has no events, so we cannot just copy it.

## Goals / Non-Goals
Goals: `calendar`, `bookmarks`; list styles + `meta`; media `meta`/`row`/restyle; notification summaries; docs/templates/tests per type; zero new runtime deps.
Non-goals: fetching (gcal/RSS), LLM filtering, recurrence expansion (agent writes concrete occurrences), event editing, embedded video, icon CDN, list `cards` style, list on sides, time-zone picker.

## Requirements

### R1 calendar (side-allowed)
| Item | Rule |
|---|---|
| Data | `{ events: Event[], days?: int 1-31 = 7 }`; `events` max 500, may be empty |
| Event | `title` 1-200; `start` req; `end?`; `allDay?` bool; `location?` string ≤200; `link?` `linkSchema`; `color?` `colorSchema` |
| Dates | `start`/`end` = `timestampSchema` (RFC 3339 with offset/Z). When `allDay: true`, date-only `YYYY-MM-DD` is also accepted. `end >= start`. Anything else = schema-invalid -> Broken |
| Display tz | Browser local tz (`Intl`), never server tz |
| Month grid | 7 cols, 6 rows, weekday header + week start from `Intl.Locale.getWeekInfo()` (fallback Monday); out-of-month days muted; dot (event colour or `--color-primary`, max 3 dots) on days with events; today highlighted; prev/next/today controls (local state, resets to current month on data refresh) |
| Agenda | Next `days` days from today (today inclusive), grouped by day heading ("Today", "Tomorrow", "Wed, Oct 16"); row = time (or "All day"), title (link if `link`), muted `location`; event colour = left bar; empty day groups omitted; none at all -> "Nothing scheduled" |
| Click day in grid | Scrolls/filters agenda to that day (local state); in column mode purely visual |
| Fullscreen | Agenda expands to selected month's full event list (not limited by `days`); grid larger |
| Summary | First upcoming event "Title (+N more)"; no events -> `''` |

### R2 bookmarks (side-allowed)
| Item | Rule |
|---|---|
| Data | `{ groups: Group[] }`, groups 1-50 |
| Group | `title?` ≤100; `color?` `colorSchema` (tints title only); `links` 1-100 |
| Link | `title` 1-200; `url` = `linkSchema`; `description?` ≤200; `icon?` string ≤8 chars (emoji/short text; no URLs: refused if it matches `^[a-z]+:` or contains `/`) |
| Render | Group title (tinted), list of links via shared `CardLink` (visited styling); icon left of title; description muted under; untitled group = no heading, separator only |
| Search | Header search filters links by title/description/url (existing `searchText` seam) |
| Summary | `"N links"` |

### R3 list extensions (center-only, unchanged `deny`)
- `style` in card.json: `rows` (default, today's look) | `detailed`. Unknown value -> `schema-invalid` Broken.
- Item gains `meta?: string` (≤200). Rendered only in `detailed`: muted single line under the text (e.g. "github · 2h ago"), ellipsis. In `rows`, `meta` is ignored, not an error.
- `detailed` look = Glance rss-detailed-list: title (2-line clamp), meta line, subtitle muted. Checkbox/due/links/action all still work in both styles. No `cards` style.

### R4 media extensions
- Item gains `meta?: string` (≤200). `caption` is now the title: 2-line clamp (`.clamp-2`), `title` attr = full text. `alt` stays for a11y.
- `layout`: `grid` (default) | `single` | `row` (horizontal scroll, scroll-snap, fixed card width). Cards: 16:9 thumbnail (`object-fit: cover`), title, muted meta (Glance videos-grid / rss-horizontal-cards).
- Thumbnails only. Click (item has `link`) opens link; no `<video>`/iframe. `src` stays `mediaSrcSchema` (http(s) or data:image).
- Summary unchanged (first caption else "N images").

### Cross-cutting (each new/changed type)
Empty state, Broken via contract error, stale/fullscreen handled by frame (SP03/04). `allowedModes: ['column','now','fullscreen']`. Both new types: `Now` mode renders same body.

## Architecture

### Contract
```ts
// formats.ts (new, shared by calendar + bookmarks)
export const colorSchema = z.string().regex(/^(primary|positive|negative|\d{1,3} \d{1,3} \d{1,3})$/);  // Glance "H S L" or token name
// calendar.ts
const eventSchema = z.looseObject({ title: z.string().min(1).max(200),
  start: z.string(), end: z.string().optional(), allDay: z.boolean().optional(),
  location: z.string().max(200).optional(), link: linkSchema.optional(), color: colorSchema.optional() })
  .superRefine(/* date format per allDay; end >= start; paths ['start'|'end'] */);
export const calendarDataSchema = z.looseObject({ events: z.array(eventSchema).max(500), days: z.number().int().min(1).max(31).optional() });
// bookmarks.ts
export const bookmarkLinkSchema = z.looseObject({ title, url: linkSchema, description?, icon?: iconSchema });
export const bookmarksDataSchema = z.looseObject({ groups: z.array(groupSchema).min(1).max(50) });
// list.ts: listItemSchema += meta: z.string().max(200).optional()
// media.ts: mediaItemSchema += meta; layout: z.enum(['grid','single','row']).optional()
```
`colorSchema` is a closed grammar, so the value is interpolated into `hsl(...)` / `var(--color-*)` safely (no CSS injection). Date parsing reuses the `timestampSchema`/`dueSchema` helpers [verified: src/contract/formats.ts `isRfc3339`, `isDateOnly`; `dueSchema` already accepts date-only or datetime]; the `allDay` branch calls `dueSchema`.

### View-field placement
| Field | Where | Why |
|---|---|---|
| list `style` | card.json top-level `style` | Owner decision; pure view, same data renders either way, owner can flip without agent re-run |
| media `layout` | **stays data.json** | [verified: src/contract/types/media.ts `mediaDataSchema.layout`] Moving breaks existing cards + templates; card.json already has `layout` = `{column,order,height}` [verified: src/contract/card-def.ts:34], so a media `layout` there would collide by name; agent often picks single vs grid from item count (content-dependent) |
| calendar `days` | data.json (locked) | Agent knows how far ahead it fetched |
Rule for 01/skill docs: *card.json = where/how the frame shows it; data.json = what the content is, including content-coupled layout.* The inconsistency (list style vs media layout) is accepted and documented in SKILL.md.
Plumbing: `cardDefSchema` stays loose; `style` is read from the def, validated by an optional per-type `view` zod in the registry, and surfaced as `ViewCard.style?: string` [verified: ViewCard has no view fields, src/shared/api-types.ts:10-32]. `validateFolder` runs `entry.view?.safeParse({style})` after the type check -> `schema-invalid` with path `['style']`.

### Registry entries
```ts
calendar:  { schema: calendarDataSchema,  summary: calendarSummary,  template: {...}, sides: 'allow' },
bookmarks: { schema: bookmarksDataSchema, summary: bookmarksSummary, template: {...}, sides: 'allow' },
list:      { ..., view: z.object({ style: z.enum(['rows','detailed']).optional() }), sides: 'deny' },
```
`TypeEntry` gains optional `view?: z.ZodType`. UI: `registerCardType('calendar'|'bookmarks', ...)`, `DataByType` + imports in `ui/src/types/index.ts` extended.

### Renderer anatomy
`ui/src/types/<type>/{index.ts, logic.ts, <Type>Body.tsx}`; CSS in `ui/src/styles/types/<type>.css` (SP03 tree, one import line each in `main.tsx`), using SP03 hooks only: `.truncate`, `.clamp-2`, `.visited-arrow`, `.list--rows|detailed`, `.meta-line`, `.media-grid|.media-row`. New classes `.cal-grid`, `.cal-day`, `.cal-agenda`, `.bm-group` are 05's, built from tokens only (no hex; SP03 test enforces). Pure logic in `logic.ts` (testable without DOM): `buildMonth`, `buildAgenda`, `searchText`.

### Month-grid / agenda algorithm (`calendar/logic.ts`, no date library)
1. **Day key** = `YYYY-MM-DD` string from `Intl.DateTimeFormat('en-CA', {timeZone: tz, ...}).formatToParts` (tz = `Intl.DateTimeFormat().resolvedOptions().timeZone`, injectable for tests). Date arithmetic on keys uses integer y/m/d via `new Date(y, m, d)` (local, DST-safe at day granularity); never add 86,400,000 ms.
2. **Timed event** spans local day(s) of `start` through local day of `end` (if `end` is exactly local 00:00, the last day is the day before; no `end` = start day only). Multi-day: appears on each spanned day; time label "starts 9:00" first day, "all day" middle, "until 5:00" last.
3. **All-day event**: day keys are read *literally* from the string's date part (no tz conversion; an all-day on Oct 16 is Oct 16 anywhere). `end` is **inclusive** (last day shown). Documented in SKILL.md.
4. Index `Map<dayKey, Event[]>`; sort allDay first, then `start` instant, then title.
5. **Month grid**: first cell = start of week on/before the 1st; 42 cells; dots = events at index for that key.
6. **Agenda**: keys today..today+`days`-1; events already underway (multi-day) show under today; today's finished timed events dimmed. `now` from `useNow` so the grid/agenda roll over at local midnight.
7. Bad/ambiguous input never reaches here (contract rejects); logic additionally guards `Number.isNaN` and skips.

### Files
New: `src/contract/types/{calendar,bookmarks}.ts`, `ui/src/types/{calendar,bookmarks}/*`, `ui/src/styles/types/{calendar,bookmarks}.css`, `templates/{calendar,bookmarks}/{card,data}.json`, `schemas/data.{calendar,bookmarks}.json`, `tests/contract/types-calendar-bookmarks.test.ts`, `ui/tests/{calendar-logic,calendar-body,bookmarks-body,list-detailed,media-layouts}.test.tsx`, `docs/decisions/0009-new-types.md`, changeset.
Edited: `registry.ts`, `formats.ts`, `list.ts`, `media.ts`, `src/index.ts` (export types/schemas), `api-types.ts` (`style?`), `folder-validate.ts` (view check), templates for list (`style: detailed` example) and media (`meta`, `row` example), `SKILL.md`, `docs/reference/card-schema.md`, `ui/src/types/{index.ts,list/*,media/*}`, `ui/src/registry/registry.ts`.

## Decisions
| # | Decision | Choice | Alternatives | Why |
|---|---|---|---|---|
| 1 | list `style` location | card.json top-level, validated by registry `view` | data.json; nested `view:{}` object | Owner decision; flat key matches brief; registry keeps card-def generic |
| 2 | media `layout` location | Keep data.json | Move to card.json `style` | No migration; name collision with card.json `layout`; content-coupled |
| 3 | allDay dates | Date-only allowed only with `allDay`; read literally; end inclusive | Always require offset; gcal-style exclusive end | Floating dates are tz-agnostic; inclusive is what agents/LLMs naturally write |
| 4 | Recurrence | None; agent expands | rrule parsing | Needs a lib; agent job |
| 5 | `colorSchema` | Glance "H S L" or token name | Free CSS colour; hex | Closed grammar = no CSS injection; themes with `--cm` |
| 6 | Bookmark `icon` | ≤8 chars, no `/`/scheme | Free string | Blocks URL-as-icon, no CDN |
| 7 | `meta` ignored in `rows` | Silent ignore | Error | Lets agent flip style without rewriting data |
| 8 | Month navigation | Local UI state only | URL/state persisted | Reference widget; reset on refresh is acceptable |
| 9 | Week start | `Intl.Locale.getWeekInfo` fallback Monday | Hard Sunday; setting | No config; Chromium/Safari support it, Firefox falls back |
| 10 | Event cap | 500 | Unbounded | Bounded render; data.json 1 MB cap exists |

## Risks / Open Questions
| Item | Status |
|---|---|
| `getWeekInfo` missing in Firefox | [RESOLVED: fallback Monday via try/catch; test both paths] |
| Per-type `view` zod touches 04's `folder-validate.ts`/`registry.ts` | [RESOLVED: 05 owns the registry `view` zod and `folder-validate.ts` view check as additive edits; 04 adds neither (04 Architecture notes the extension)] |
| `ViewCard.style` addition in 04-owned `api-types.ts` | [RESOLVED: 05 owns `ViewCard.style?: string` as a one-line additive edit in 04's `api-types.ts`; generic `view` bag not adopted] |
| Click-day-filters-agenda vs plain info | [DEFERRED] ship visual-only dots + today highlight; day click is a stretch, decide at mockup review |
| Tickdeck cards with `meta` in `rows` confuse agents | [RESOLVED: SKILL.md states meta is detailed-only] |
| Media `row` scroll on mobile / keyboard access | [OPEN] needs `tabindex` on scroll container; verify in smoke |
| Fullscreen for bookmarks | [RESOLVED: multi-column wrap, same renderer] |

## Acceptance Criteria
1. `calendar` card with 3 events renders: month grid with dots on those days, today highlighted, agenda grouped by day; a multi-day event appears on every spanned day; all-day shows "All day" and keeps its date when browser tz changes (test with injected tz `Pacific/Kiritimati` and `America/Los_Angeles`).
2. Event with `start: "Oct 5"` or `end < start` -> card Broken `schema-invalid` with path; `tickdeck validate` exits non-zero.
3. `bookmarks` card renders tinted group titles, links open via `CardLink` with visited styling; `icon: "https://x/y.png"` rejected.
4. `calendar`/`bookmarks` in left column validate OK; `list` there stays `side-not-allowed` (SP04); registry exhaustiveness test passes with `sides` declared.
5. List `style: detailed` shows `meta` line; `style: cards` -> Broken; default unchanged (existing list tests green).
6. Media: `layout: row` scrolls horizontally; long `caption` clamps to 2 lines with full-text `title`; `meta` muted; no `<video>`/`<iframe>` in DOM.
7. Empty `events: []` -> "Nothing scheduled"; summaries covered by unit tests.
8. `npm run gen:schemas` output committed, no diff after re-run; templates validate against schemas (`templates-schemas.test.ts`); `npm run validate` and `npm run test:smoke` green; no new runtime deps in `package.json`.
Tests: `tests/contract/` (schemas, dates, colour, icon, summaries, view validation), `ui/tests/calendar-logic` (month build, DST edges, midnight-end, week start, agenda grouping), body render tests per type, regression test for media layouts.
