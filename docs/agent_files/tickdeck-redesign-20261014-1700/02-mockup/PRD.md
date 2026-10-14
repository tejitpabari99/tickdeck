---
status: draft
summary: One static HTML mockup (Tickdeck, Catppuccin Mocha, JetBrains Mono, Glance box/title/spacing model) with made-up data, published as a private Artifact; owner approval gates sub-project 03.
date: 2026-10-14
---
# PRD: Tickdeck mockup (SP02)
Repo/branch: crontick-dashboard (→ tickdeck) / `initial-brainstorming` · Depends on: nothing (parallel with 01) · Owns: `docs/agent_files/tickdeck-redesign-20261014-1700/02-mockup/mockup.html` (+ the private Artifact). No source-code changes.

## TL;DR
Build one self-contained `mockup.html` that looks like the finished Tickdeck: header, 300 / flexible / 300 columns, every card type and state in the brief, Glance-faithful tokens and spacing. CSS is organised in sections that mirror Glance's file split so SP03 can lift the token block and class structure. Publish privately as a claude.ai Artifact. Owner approval = gate for SP03 (and effectively 04/05). Tests the one real risk: "still looks boring".

## Problem
Current UI is barren: near-black flat surfaces, neutral greys, 12px gaps, bold, ~9px status dots with no colour [verified: `ui/src/zones/header.css`, `ui/src/theme/themes.css`]. A full CSS rewrite (SP03) is expensive; approve the look cheaply first.
Status-dot bug cause [verified: `ui/src/theme/tokens.css:13-14` defines `--positive` as a full `hsl(...)`; `header.css:12-13` wraps it again as `hsl(var(--positive))` → invalid → no background]. The mockup shows dots coloured; SP03/04 fixes by using the colour var directly.

## Goals / Non-Goals
Goals: owner can judge look at desktop and phone width; every Glance feature that makes it look good is present (see "Why Glance looks good"); token block is directly portable.
Non-goals: real data, React, interactivity beyond CSS `:hover`, `<details>` for Completed, a tiny optional script for the filter/search highlight. No light mode, no theme toggle. No tasks file. No building in `ui/`.

## Requirements

### Page content
| Area | Cards / states |
|---|---|
| Header | "Tickdeck" logo (highlight colour, 20px, right border, like Glance `.logo`), date, search input, All/Alerts/Cards segmented filter (All active), status dots: connection (ok = positive green) + one alert-count dot (negative), both visibly coloured with a soft glow ring |
| Alert strip | Full width, 2 one-line rows: one high (negative dot), one normal; tick button right |
| Left (300) | **Calendar** (side, flat): mini month grid, today highlighted, event dots under days, agenda below grouped by day (Today / Tomorrow / Fri Oct 16), 5-6 events, one all-day. **KPI**, with one **stale** treatment (muted + "stale 3h" tag) |
| Center | **Now zone**: 1 card, priority high, left edge negative, "updated 2m ago", unseen dot. **Email table** (priority normal, left edge primary): columns Time (xs), From (s, ellipsis), Subject (fill, ellipsis), short dates "Oct 9, 5:06p", one sortable header marked, one row hover. **Detailed list** (`style: detailed`): title, muted `meta` line, link arrow. **Media grid**: 4 thumbs (CSS gradients, no remote images), 16:9, 2-line clamped caption, muted meta. One card **hovered** (forced `:hover` class) showing Done / hide / fullscreen buttons. One **priority-low** card with muted edge. One **Broken** card (negative tint, reason). **Completed (3)** collapsed `<details>` full width below columns |
| Right (300) | **Bookmarks**: 3 groups, one colour-tinted title, links with emoji icon + muted description, `↗` arrows. **Markdown**: heading, paragraph, bullet list, inline code, link (unvisited colour primary). One Broken or stale side card allowed if space (not required) |
| Footer note (small, subdue) | "Mockup - made-up data" |

Side cards: no buttons, no priority edge, no dot, no "updated". Center cards: all of those. Sides never contain table or list.

### Narrow
`<1200px`: single column, order center, left, right [verified: brief]. 16px page gutter; no horizontal page scroll at 360px; the email table scrolls inside its card (`overflow-x:auto`) while still clipping cells with ellipsis; header wraps (logo + dots row, then search, then filter).

### Why Glance looks good (builder checklist; each is a requirement)
1. **Tinted greys.** Every grey carries the bg hue (240) at the bg saturation (21%); never `#888`. Text is 5 tiers of lightness: highlight/paragraph/base/muted/subdue [verified: `main.css` 47-51].
2. **Box is only +1% lighter than page, border +4%, 5px radius, plus a hard 3px bottom shadow** `0 3px 0 hsl(bg, bgl-0.5%)` [verified: `widgets.css` 61-66]. The shadow gives the "slab" depth; not blur.
3. **Title outside the box**, above, uppercase-ish 14px, left-padded to align with box content (`padding: 0 18px`), 9px below [verified: `.widget-header`].
4. **Generous padding.** 15px vertical / 17px horizontal inside; 23px between widgets; 23px page padding; line-height 1.6 [verified: `main.css` 17-19, `site.css` body].
5. **Root font-size 10px, rem units**, JetBrains Mono 13px, ligatures off, weight 400 only.
6. **One accent used sparingly**: primary (blue) for `↗` arrows on unvisited links, active filter, today cell, focus ring. Visited arrows revert to base text [verified: `utils.css` `.visited-indicator`].
7. **Quiet separators**: 1px `--color-separator` between list rows (padding = half-gap), `•` separators in inline meta.
8. **Dim thumbnails** (`grayscale(.2) contrast(.9)`, opacity .8) that wake on hover, 1px separator border, 5px radius [verified: `utils.css` `.thumbnail`].
9. **Small touches**: page entrance fade (`translateY(10px)`, .3s), staggered list-item reveal (30ms steps), custom `::selection`, 5px thin scrollbars in subdue colour, `*:focus-visible` 2px primary outline.
10. **Error header**: negative tint block at 5% opacity behind the broken title (`.widget-error-header::before`).

## Architecture

### File layout
`02-mockup/mockup.html`: single file, one `<style>` with banner comments in Glance order so SP03 maps 1:1:
```
/* === main.css === font-face + :root tokens (+ derived) */
/* === site.css === page, header, columns, body, scrollbars, selection */
/* === utils.css === truncate, clamp-2, visited arrow, separators, thumbnail, size-h*, colour helpers */
/* === widgets.css === .card frame, .card-header, side vs center variants, states (stale/broken/hover/unseen) */
/* === types/kpi | markdown | table | list | media | calendar | bookmarks === */
/* === mobile.css === @media (max-width:1200px) */
```
Classes `kebab-case`, BEM-free, named after intended React classes (`card`, `card-header`, `card-body`, `card--center`, `card--side`, `prio-high|normal|low`, `card-actions`, `unseen-dot`, `stale-tag`).
Font: Google Fonts `<link>` for JetBrains Mono 400 (Artifact allows only Google Fonts stylesheets); real app bundles woff2 locally (SP03). Falls back to `monospace`. Inline SVG for icons. No scripts needed beyond optional ≤30 lines.
Artifact: `<title>` "Tickdeck Mockup", private (default), `icon: dashboard`. `:root` tokens + body explicit background (satisfied by tokens). Because only one theme exists, no `prefers-color-scheme` block is needed; add `color-scheme: dark`.

### Token table (inputs: Glance Catppuccin Mocha preset [verified: glance `docs/themes.md` 36-45])
| Token | Input value | Note |
|---|---|---|
| `--bgh / --bgs / --bgl` | `240 / 21% / 15%` | `background-color: 240 21 15` |
| `--cm` | `1.2` | contrast multiplier |
| `--tsm` | `1` | default text-saturation mult. |
| `--color-primary` | `hsl(217, 92%, 83%)` | |
| `--color-positive` | `hsl(115, 54%, 76%)` | |
| `--color-negative` | `hsl(347, 70%, 65%)` | |

Derived (formulas from `main.css`; dark scheme, `--scheme` empty; resulting values at the inputs above) — builder must write the calc() forms, and these computed values are the check:
| Token | Formula | Result |
|---|---|---|
| `--color-background` | `hsl(bgh,bgs,bgl)` | hsl(240 21% 15%) |
| `--color-widget-background` | bgl + 1% | l 16% |
| `--color-widget-content-border`, `-background-highlight` | bgl + 4% | l 19% |
| `--color-separator` | bgl + 4%·cm | l 19.8% |
| box bottom shadow | bgl − 0.5% | l 14.5% |
| `--color-popover-background` | bgs+3%, bgl+3% | 24% / 18% |
| `--color-popover-border` | bgl + 12% | l 27% |
| `--color-progress-border` | bgl + 10%·cm | l 27% |
| `--color-progress-value` | bgl + 26%·cm | l 46.2% (sat × tsm) |
| `--color-graph-gridlines` | bgl + 6%·cm | l 22.2% |
| `--color-text-highlight` | 85%·cm | l 100% (clamped) |
| `--color-text-paragraph` | 73%·cm | l 87.6% |
| `--color-text-base` | 58%·cm | l 69.6% |
| `--color-text-base-muted` | 52%·cm | l 62.4% |
| `--color-text-subdue` | 35%·cm | l 42% |
Text hue/sat = `bgh, bgs·tsm`. Tickdeck-only additions (derived from the same inputs, no new hard-coded colours): `--prio-high: var(--color-negative)`, `--prio-normal: var(--color-primary)`, `--prio-low: var(--color-text-subdue)`, `--unseen: var(--color-primary)`, `--stale: var(--color-text-subdue)`.

### Spacing / type scale
| Token | Value |
|---|---|
| `:root font-size` | 10px (rem base) |
| `--font-size-h1..h6, base` | 17 / 16 / 15 / 14 / 13 / 12 / 11 px |
| `--widget-gap` | 23px (columns gap, vertical card gap, page padding-block) |
| `--widget-content-padding` | 15px 17px |
| `--content-bounds-padding` | 15px (page horizontal; 16px under 1200px) |
| `--border-radius` | 5px |
| side columns / header height | 300px / 45px; header gap 25px |
| line-height / weight | 1.6 / 400 only (emphasis = colour tier, not bold) |
| list gap (`--list-half-gap`) | 5px (rows 10px apart, with separator) |
| media grid | 2 cols in center, gap ≈ 0.7·15px, thumb `aspect-ratio:16/8.9` |
| Center edge | 3px left border in `--prio-*`, inside the border radius |

### Card frame anatomy
```
[ TITLE 14px upper, subdue-ish ... updated 2m ago ]      <- outside box (center adds "updated", dot, actions on hover)
┌────────────────────────────┐ border 1px +4%
│ 15px / 17px padding         │ bg +1%, radius 5, 3px hard bottom shadow
│ body                        │ center: 3px priority left edge
└────────────────────────────┘
```
| Part | Side | Center |
|---|---|---|
| Title row | title only | title + "updated Xago" (muted, `•`-separated) + unseen dot (7px, primary) |
| Actions | none (fullscreen icon on hover only) | hover: Done, hide, fullscreen (icon+label, 12px, ghost buttons, `--color-widget-background-highlight` bg on hover) |
| Edge | none | priority colour |
| Stale | muted body, "stale 3h" tag | same |
| Broken | error header tint + reason, dashed negative border | same + Done/hide |

### Made-up data outline
| Card | Data |
|---|---|
| Now | "Standup in 10 min" markdown/kpi style, high |
| Calendar (left) | 6 events over 5 days relative to a fixed date (Wed Oct 14, 2026): 1 all-day, one with location, colours from the 3 accents |
| KPI | 3 numbers ("Open PRs 7", "Build ok", "Disk 63%") with `+/-` delta in positive/negative |
| Email table | 8 rows, fake senders ("Billing Bot", "Calendar", "Dana R."), long subjects (must truncate), times "Oct 14, 9:02a"; no real mail |
| Detailed list | 5 items: title, `meta` ("deploy · 12m ago · prod"), 1 with a link |
| Media | 4 items, gradient thumbs from palette, captions long enough for 2-line clamp, meta "3 min · Oct 12" |
| Bookmarks | groups: "Work" (primary), "Reading" (positive tint), untitled; ~8 links, emoji icons on 4, descriptions on 3 |
| Markdown | ~10 lines |
| Completed | 3 rows (title, "done 1h ago", Reopen) |

## Decisions
| # | Decision | Choice | Alternatives | Why |
|---|---|---|---|---|
| 1 | Mockup form | One HTML file, hand-written | React/vite page; screenshot-only | Fastest review; Artifact needs single file; no build |
| 2 | Units | rem with 10px root, as Glance | px | Token and spacing values lift 1:1 into SP03 |
| 3 | Colours | Glance calc() model, 6 inputs | Hard-coded hex per element | Proves the theming model SP03 will ship |
| 4 | Font | Google Fonts link in mockup | Base64 woff2 inline | Allowed in Artifact; smaller; real app bundles locally |
| 5 | Thumbnails | CSS gradients | Remote images | Offline-safe, no external content |
| 6 | Hover state | Static forced class on one center card + real `:hover` on others | Hover only | Reviewer sees actions without hovering (phones) |
| 7 | Interactivity | CSS only; optional tiny script | Full React behaviours | Look approval only |
| 8 | Visibility | Private Artifact | Public link | Owner approval gate; project is personal |
| 9 | CSS organisation | Sections mirroring Glance files | Free-form | SP03 lifts structure |

## Manual steps (owner)
1. Open the private Artifact link, check desktop and phone width.
2. Reply approve / request changes; record "approved <date>" in this PRD's status (`approved`) or the run README. Changes loop back to this sub-project.

## Risks / Open Questions
| Item | Tag |
|---|---|
| Even Glance styling looks flat with sparse data | [OPEN] mitigated by realistic fill (8 rows etc.); owner judges |
| Uppercase titles: Glance's `.widget-header` is 14px, no explicit `text-transform` found in widgets.css; brief says uppercase | [RESOLVED: apply `text-transform:uppercase`, letter-spacing 0.04em; owner can veto in review] |
| `--cm: 1.2` pushes highlight text to pure white (clamped) | [RESOLVED: accepted; matches Glance preset] |
| Status-dot colour bug fix itself | [DEFERRED: SP03/04; mockup only shows intended look] |
| AGPL: mockup copies no Glance CSS verbatim, only values + structure | [RESOLVED: write fresh selectors; NOTICE is SP01/03] |
| Artifact font load blocked offline | [RESOLVED: monospace fallback] |
| Does SP03 need pixel screenshot reference? | [DEFERRED: SP03 takes screenshots of the approved Artifact] |

## Acceptance Criteria
1. `02-mockup/mockup.html` exists, opens standalone, product name "Tickdeck" everywhere, no "crontick".
2. Published as a **private** Artifact; URL recorded in the run notes.
3. All cards in the Page content table present with the listed states (stale side, Broken, forced-hover center, priority-high Now, priority-low, Completed collapsed).
4. `:root` token inputs equal the Token table; derived tokens use calc() from them; computed lightness values match the Derived table (spot-check 5 in devtools).
5. Sides contain no table/list, no buttons, no priority edge, no unseen dot; center cards have all four.
6. Items 1-10 of the "Why Glance looks good" list are visible (shadow, outside title, tinted greys, 23px gaps, ↗ accent, dim thumbs, etc.); weight is 400 everywhere.
7. Table: From narrow, Subject fills, cells ellipsis, dates short form.
8. At 360px width: no horizontal page scroll, 16px gutters, stack order center, left, right; at 1280px three columns 300/flex/300.
9. Header status dots visibly coloured.
10. Owner approval recorded before SP03 starts.
