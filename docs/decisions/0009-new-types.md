# 0009: New card types and view-field location

- Status: Accepted
- Date: 2026-10-14

## Context

Side columns are permanent reference but only `kpi`, `markdown` and `media` could go there. There was no event view and no link collection, and center `list`/`media` looked plain. Needed: new types, a safe colour value, and a rule for where view fields (style, layout) live.

## Decision

- **`calendar` and `bookmarks`** are registry types with `sides: 'allow'`. `calendar` is a month grid plus an agenda for the selected day; `events` is capped at 500 and there is no `days` field. Agents write events for at least the visible month. `bookmarks` is 1-50 groups of 1-100 links; `icon` is an emoji or short text (at most 8 chars), URLs and paths refused.
- **All-day dates** are read literally (date part of the string, no time zone conversion) and `end` is inclusive. Date-only values are valid only with `allDay: true`; otherwise RFC 3339 with offset or `Z`. `end` must not be before `start`.
- **`colorSchema`** is a closed grammar: `primary`, `positive`, `negative`, or `"H S L"`. No hex or `hsl()`, so the value can be interpolated into CSS without injection.
- **`list` `style`** (`rows` default, `detailed`) lives in `card.json`, validated by an optional per-type `view` zod on the registry entry; unknown values are `schema-invalid` at `/style`. `ViewCard.style` carries it to the UI. `meta` (at most 200 chars) on list items shows only in `detailed` and is ignored in `rows`.
- **`media`** gains item `meta` and `layout: 'row'`; `layout` stays in `data.json`.
- **Field rule:** `card.json` = where/how the frame shows the card; `data.json` = what the content is, including content-coupled layout. The list `style` (card.json) vs media `layout` (data.json) inconsistency is accepted.
- `list` stays `sides: 'deny'`.

## Alternatives considered

Moving media `layout` to card.json (breaks existing cards, collides with `layout`); `style` inside data.json or a nested `view` object; exclusive all-day `end` (Google Calendar style); always requiring offsets; an N-day agenda with `days`; free-form CSS colours.

## Consequences

Agents must write a month of events themselves; two view fields live in different files. New types must declare `sides` and may add a `view` validator. Adding a colour form later is a contract change.

## Revisit when

Agents routinely need recurring events, more than a month of agenda, or the style/layout split causes real mistakes.
