---
"tickdeck": minor
---

New card types `calendar` (month grid plus day agenda; all-day dates read literally with inclusive `end`) and `bookmarks` (link groups), both allowed in side columns. `list` gains card.json `style: rows | detailed` and item `meta`; `media` gains item `meta` and `layout: "row"`. New `colorSchema` (`primary`, `positive`, `negative` or `"H S L"`). Agents should write calendar events for at least the visible month.
