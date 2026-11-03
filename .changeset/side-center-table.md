---
"tickdeck": minor
---

Side columns are now permanent reference: `table` and `list` cards in `left`/`right` are Broken with `side-not-allowed`; side cards have no Done/Hide, are never in Now, ignore `priority` (warning), and Done/Hide on them return 400 `PERMANENT_CARD`. `ViewCard` gains `permanent`. Tables gain per-column `width`, clipped compact cells, content-sized columns, re-sorting on data refresh, short date display, and a warning for non-ISO cells in explicit date columns.
