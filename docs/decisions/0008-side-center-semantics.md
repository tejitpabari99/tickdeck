# 0008: Side/center semantics

- Status: Accepted
- Date: 2026-10-14

## Context

Left/right columns are permanent reference, but `table` and `list` cannot render correctly in narrow columns. Where to enforce this, and what to do with an offending card, needed one rule shared by ingest and the CLI.

## Decision

- **Registry flag.** Each type entry declares `sides: 'allow' | 'deny'` (`table`, `list` deny; `markdown`, `kpi`, `media` allow). The type system makes it mandatory for new types. `validateFolder` checks it right after the registered-type check, so ingest and `tickdeck validate` agree.
- **Reject, not move.** A denied type in `left`/`right` is Broken with reason `side-not-allowed`. Cards are never moved silently, so agents learn from the error.
- **Priority ignored.** `priority` on a side card is ignored with a validation warning, not rejected: it is harmless there.
- **Permanent cards.** `ViewCard.permanent` (column is not center): priority 2, never collapsed, in Now, Done, hidden or Completed. Done/Hide return 400 `PERMANENT_CARD`; `DELETE` variants still work to clear leftovers. Existing acks/hidden entries are ignored, not purged.
- **Table `width`.** Optional per-column `xs|s|m|l|fill`; non-ISO cells in an explicit `sort: "date"` column warn rather than fail.

## Alternatives considered

Hardcoded type lists in ingest and CLI; silently moving the card to center; rejecting `priority` on side cards; allowing and ignoring Done/Hide.

## Consequences

Existing table/list cards in side columns go Broken on upgrade (accepted, pre-1.0). New types must declare `sides`.

## Revisit when

A narrow-friendly table or list variant exists, or side cards need Done/Hide.
