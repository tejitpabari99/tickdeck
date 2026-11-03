---
status: done
summary: 9 tasks to hand-build the Tickdeck mockup.html, verify it against the PRD, publish it as a private Artifact, and gate SP03 on owner approval.
date: 2026-10-14
---
# Tasks: Tickdeck mockup (SP02)
Source of truth: `02-mockup/PRD.md` (approved, no open items). One self-contained `mockup.html` in this folder, no source-code changes. The implementing agent loads the `artifact-design` skill (or runs the Artifact quickstart) before writing the page. Fresh selectors only; no Glance CSS copied verbatim (PRD Risks, AGPL).

| # | Task | Depends on | Status |
|---|---|---|---|
| 1 | Tokens, base CSS, page shell, header, alert strip | none | done |
| 2 | Card frame and states | 1 | done |
| 3 | Left column: calendar and KPI | 2 | done |
| 4 | Center column cards and Completed | 2 | done |
| 5 | Right column: bookmarks and markdown | 2 | done |
| 6 | Narrow layout and small touches | 3, 4, 5 | done |
| 7 | Self-check against acceptance criteria | 6 | done |
| 8 | Publish private Artifact | 7 | done |
| 9 | Owner review and approval | 8 | done |

## Task 1 — Tokens, base CSS, page shell, header, alert strip
What it is: the foundation of the single file, per Decisions 1-3, 9 and the Architecture file layout.
What changes at a high level: create `mockup.html` with one `<style>` using banner comments in Glance's file order. `:root` holds the six token inputs and derived tokens as calc() forms, plus the Tickdeck priority/unseen/stale aliases, rem scale on a 10px root, JetBrains Mono via Google Fonts link with monospace fallback, `color-scheme: dark`, weight 400 only. Build the three-column shell (300 / flexible / 300), header (logo, date, search, All/Alerts/Cards filter, two glowing status dots), full-width alert strip (2 rows, tick button), footer note. Title "Tickdeck Mockup"; no "crontick" anywhere.
Done when: shell renders at 1280px with token values matching the PRD Derived table, and header dots are visibly coloured.

## Task 2 — Card frame and states
What it is: the shared card anatomy and its variants (PRD Card frame anatomy, Decisions 6, 9).
What changes at a high level: add `card`, `card-header`, `card-body`, side vs center variants. Title outside the box, uppercase with 0.04em letter-spacing, 1% lighter box, +4% border, 5px radius, hard 3px bottom shadow, 15px/17px padding. Center gets priority left edge, "updated Xago", unseen dot, Done/hide/fullscreen actions on hover plus one forced-hover class. Add stale (muted, "stale 3h" tag) and Broken (error-header tint, dashed negative border, reason) states.
Done when: a sample side card and center card show every difference listed in the anatomy table.

## Task 3 — Left column: calendar and KPI
What it is: the two side cards (PRD Page content, Made-up data, AC 3b).
What changes at a high level: calendar with mini month grid for Oct 2026 (fixed today Wed Oct 14), event dots, today highlight, agenda for today (3-4 events, one all-day, one with location, three accent colours), 6 events across 5 days, one empty day. Tiny inline script (the only one, 30 lines or fewer) for click-to-select with distinct highlight, "No events", and return to today. KPI card with three numbers and +/- deltas, one stale treatment.
Done when: clicking days swaps the agenda correctly and clicking today restores it; side cards have no buttons, edge, dot or "updated".

## Task 4 — Center column cards and Completed
What it is: all center content (PRD Page content table, Made-up data).
What changes at a high level: Now zone (high priority, "Standup in 10 min", unseen dot, "updated 2m ago"); email table (8 fake rows, sortable header marked, From narrow with ellipsis, Subject fills, short dates, one row hover, primary edge); detailed list (5 items with meta line, one link arrow); media grid (4 gradient thumbs, 16:9, dimmed until hover, 2-line clamped captions); one forced-hover card; one priority-low card; one Broken card; collapsed Completed (3) `<details>` full width below columns.
Done when: all listed cards and states are present, long text truncates, and sides contain no table or list.

## Task 5 — Right column: bookmarks and markdown
What it is: the two right-side cards (PRD Page content, Made-up data).
What changes at a high level: bookmarks with 3 groups (Work primary-tinted title, Reading positive-tinted, one untitled), about 8 links, emoji icons on 4, descriptions on 3, unvisited `↗` arrows in primary. Markdown card with heading, paragraph, bullets, inline code, link in primary, about 10 lines. Optional extra Broken or stale side card only if space allows.
Done when: both cards match the data outline and use quiet separators and the five-tier text colours.

## Task 6 — Narrow layout and small touches
What it is: responsiveness plus the remaining "Why Glance looks good" items (PRD Narrow, checklist 7-9).
What changes at a high level: `mobile.css` section at max-width 1200px, single column ordered center, left, right, 16px gutters, header wrapping (logo and dots, then search, then filter), email table scrolling inside its card with ellipsis intact. Add page entrance fade, staggered list reveal, custom `::selection`, 5px subdue scrollbars, 2px primary focus-visible outline.
Done when: no horizontal page scroll at 360px and the three-column layout holds at 1280px.

## Task 7 — Self-check against acceptance criteria
What it is: verification of PRD Acceptance Criteria 1-9 before anything is published.
What changes at a high level: no content changes except fixes. Check token inputs and five derived lightness values, weight 400 everywhere, checklist items 1-10 visible, no "crontick" string, standalone open, widths 360px and 1280px (screenshots acceptable). Fix any gap found.
Done when: every criterion is confirmed and the file is committed.

## Task 8 — Publish private Artifact
What it is: publication step (Decision 8, AC 2). Done by the orchestrator through the Artifact tool, since sub-agents may lack it.
What changes at a high level: load `artifact-design`, publish `mockup.html` as a private (default) Artifact with title "Tickdeck Mockup" and icon `dashboard`, then record the URL in the run notes/README.
Done when: a private Artifact URL exists and is recorded.

## Task 9 — Owner review and approval
What it is: the owner gate for SP03 (AC 10, Manual steps). Owner-only.
What changes at a high level: owner reviews at desktop and phone width and replies approve or request changes; approval is recorded with a date. Changes loop back to Tasks 1-8.
Done when: "approved <date>" is recorded before SP03 starts.

## Owner steps
- Task 9: open the private Artifact link, check desktop and phone, approve or request changes, and record the date. Owner may also veto uppercase card titles here (PRD Risks).
