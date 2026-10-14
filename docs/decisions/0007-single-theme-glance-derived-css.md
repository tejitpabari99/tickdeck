# 0007: Single theme, Glance-derived CSS, NOTICE

- Status: Accepted
- Date: 2026-10-14

## Context

The UI carried about 600 lines of tokenised, dual-theme CSS. The approved mockup is modelled on Glance (AGPL-3.0), which uses a handful of colour inputs and a small stylesheet split. Tickdeck is MIT and must stay so.

## Decision

- **Rewrite the CSS from scratch** under `ui/src/styles/` in a Glance-shaped file split. A few colour inputs in `main.css` drive every colour via `calc()`.
- **One theme: Catppuccin Mocha.** No light mode, no theme toggle. A reskin means changing the inputs only.
- **Bundle JetBrains Mono 400** as a local woff2 with its OFL text, so the UI works offline.
- **Re-implement values and structure; never paste Glance CSS.** Pasting would force AGPL on the project.
- **Add a root `NOTICE`** crediting Glance, Catppuccin and JetBrains Mono. It is linked from the README and shipped in the package `files`; `scripts/verify-tarball.mjs` requires it.

## Alternatives considered

Re-skinning the existing tokens; keeping both themes; copying Glance CSS and relicensing as AGPL.

## Consequences

Smaller stylesheet, one look, easy reskin. Users who wanted light mode lose it. Credit is a maintenance item: new borrowed design values should keep NOTICE accurate.

## Revisit when

A second theme is requested, or Glance values are ever copied verbatim (which would require a licence review).
