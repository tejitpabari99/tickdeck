---
status: draft
summary: Seven tasks to rename the repo to Tickdeck (scripted pass, scheduler rewording, schema/lockfile regen, changeset + ADR 0006, verification, remote) plus the final folder move after sub-project 05.
date: 2026-10-14
---
# Tasks: 01 Rename to Tickdeck
Source of truth: [PRD.md](PRD.md). Mechanical rename of every tracked occurrence; no migration, aliases or visual change. The redesign record folder (D5) and git history (D9) are excluded. Tasks 1-6 run now (parallel to 02-mockup); Task 7 runs after sub-project 05.

| # | Task | Depends on | Status |
|---|---|---|---|
| 1 | Scripted rename pass + test updates | none | todo |
| 2 | Reword scheduler references | 1 | todo |
| 3 | Schema titles, regen schemas, regen lockfile | 2 | todo |
| 4 | Changeset + ADR 0006 | 3 | todo |
| 5 | Validate, smoke, verification greps | 4 | todo |
| 6 | Set git remote URL | none | todo |
| 7 | Move repo folder, repair worktrees, update projects README (run after sub-project 05 completes) | 5, sub-project 05 | todo |

## Task 1 — Scripted rename pass + test updates
What it is: Apply the PRD rename map to every unambiguous token across tracked files (D1, D2, D4, D10). Covers env vars to `TICKDECK_*`, header to `X-Tickdeck`, AUMID, package/bin/skill/data dir/`APP_NAME`, product name, localStorage keys, internal tokens, skill marker. Historical docs and ADRs included.
What changes at a high level: Scripted replace, longest token first, over tracked files; excludes `package-lock.json`, `schemas/` and the redesign folder. Tests that assert old names (listed in PRD) are updated in the same pass without weakening assertions. `package.json` name and bin become `tickdeck`.
Done when: Rename-map tokens no longer appear outside the exclusions; only scheduler references remain in grep output; tests assert the new names.

## Task 2 — Reword scheduler references
What it is: Manual pass over the roughly 110 leftover occurrences that refer to the separate scheduler (D3). Never substitute Tickdeck.
What changes at a high level: Reword to the generic concept ("a scheduled agent job", "daemon-style CLI", "daemon pattern") or delete the clause, in docs, source comments, templates and tests, so no claim becomes false.
Done when: `git grep -il crontick` (excluding the redesign folder, `schemas/`, `package-lock.json`) returns nothing; wording reads naturally with no Tickdeck-as-scheduler claims.

## Task 3 — Schema titles, regen schemas, regen lockfile
What it is: Schema titles come from the schema build script, so they are fixed at the source (Requirements 2, 3). No `$id` exists, so no URL changes.
What changes at a high level: Edit the title text in the schema build script to the `tickdeck <type> card data` form, run `npm run gen:schemas` (never hand-edit `schemas/`), then `npm install --package-lock-only`.
Done when: `schemas/` diff is only title changes; regen leaves no further diff; `npm run verify-lockfile` passes; lockfile names `tickdeck`.

## Task 4 — Changeset + ADR 0006
What it is: Record the rename for release tooling and the decision log (D6, D7).
What changes at a high level: Add a `minor` changeset for `tickdeck` stating the rename; change the package key in the existing card-folders changeset to `tickdeck`. Add `docs/decisions/0006-rename-to-tickdeck.md` covering why, no migration, scheduler references dropped, history rewritten in-tree only; link it from the docs index if one lists ADRs.
Done when: `npm run check:changesets` passes; ADR 0006 exists in house ADR format.

## Task 5 — Validate, smoke, verification greps
What it is: Prove the acceptance criteria for the rename.
What changes at a high level: Rebuild (`npm ci && npm run build`), run `npm run validate` and `npm run test:smoke`, then check the built bin: `--help` works, `info` prints a data dir ending in `tickdeck`, `/api/health` returns `app: "tickdeck"`. Run the zero-match greps (case variants and `CRONTICK_` included, redesign folder excluded) and confirm all four `TICKDECK_*` vars in the env constants. Fix any residue found. Commit.
Done when: every acceptance criterion except remote and folder move passes; `gen:schemas` leaves no diff.

## Task 6 — Set git remote URL
What it is: Point `origin` at the renamed repo (Requirement 7). Reachability is not required; the GitHub repo rename is owner-only.
What changes at a high level: `git remote set-url origin https://github.com/tejitpabari99/tickdeck.git`. No file changes, no push.
Done when: `git remote get-url origin` returns the new URL.

## Task 7 — Move repo folder, repair worktrees, update projects README (run after sub-project 05 completes)
What it is: The deferred folder move (D8); moving earlier would break absolute worktree paths mid-initiative.
What changes at a high level: Move `/root/projects/crontick-dashboard` to `/root/projects/tickdeck`; run `git worktree repair` for each worktree under the new `.worktrees/`; confirm `git worktree list` shows valid new paths. In `/root/projects/README.md`, update the row's folder column and reword its "crontick job outputs" text.
Done when: new folder exists, old one does not, worktree paths valid, README row updated.

## Owner steps
- Create/rename GitHub repo `tejitpabari99/tickdeck`.
- Delete any old data dir elsewhere by hand (none found locally).
- Out-of-repo paths keyed by old name are listed, not edited: `/root/.claude/projects/-root-projects-crontick-dashboard/`, `/root/.claude/history.jsonl`, any `~/.claude/skills/crontick-dashboard/`, any global old binary.
- Re-run `tickdeck skill` if the skill is used.
