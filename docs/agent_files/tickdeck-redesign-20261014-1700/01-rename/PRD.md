---
status: approved
summary: Mechanical rename of the whole repo to Tickdeck (package, bin, env vars, data dir, skill, UI, docs incl. history, remote), scheduler references reworded away, folder move deferred to the very last task of the initiative.
date: 2026-10-14
---
# PRD: Rename to Tickdeck (SP01)
Repo/branch: crontick-dashboard / `initial-brainstorming` · Depends on: none (parallel to 02-mockup) · Owns: every tracked file containing the old name (see Architecture), `package.json`, `package-lock.json`, `.changeset/`, `schemas/**` (regen only), `docs/decisions/` (one new ADR), git remote, and — last task only — the repo folder + `/root/projects/README.md` row

## TL;DR
One mechanical pass renames every tracked occurrence to Tickdeck: package `tickdeck`, bin `tickdeck`, `TICKDECK_*` env vars, data dir `tickdeck`, skill `tickdeck`, UI title/storage keys, all docs including historical `docs/agent_files/**` and ADRs. References to the separate scheduler are not renamed but reworded away. No migration, no aliases. Schemas regenerate; lockfile regenerates. The folder move is split out as the final task of the whole initiative (after SP05) because it breaks worktree paths. 03–05 are written against the renamed code.

## Problem
`git grep -il crontick` → 111 files, 321 occurrences `[verified]`. The name is baked into runtime behaviour (data dir via `APP_NAME`, env vars, HTTP header, Windows AUMID, localStorage keys, skill dir name), not just prose. Half of the occurrences are the *scheduler* (`crontick daemon`, "crontick job"), where a blind replace would produce false claims ("mirrors tickdeck daemon").

## Goals / Non-Goals
Goals: zero old-name occurrences in the tracked tree (except the redesign record, see D5); `npm run validate` green; behaviour otherwise unchanged; folder/remote follow.
Non-goals: data migration, back-compat aliases, "moved" hint, publishing to npm, checking `tickdeck` availability on npm, rewriting git history, any visual or contract change (SP02–05), NOTICE/Glance credit (SP03), touching the main checkout during sub-projects 02–05.

## Requirements
1. All tokens in the rename map below changed; scheduler references reworded per D3.
2. `schemas/**` regenerated with `npm run gen:schemas`, never hand-edited (titles like "crontick kpi card data" come from `scripts/schemas-build.ts`). No `$id` exists in schemas `[verified: git grep '\$id' schemas → 0]`, so no URL changes.
3. `package-lock.json` regenerated (`npm install --package-lock-only`); `npm run verify-lockfile` passes.
4. Tests asserting old names updated in the same pass (list below); no assertion weakened.
5. One changeset (`minor`, package `tickdeck`) states the rename; existing `.changeset/card-folders.md` front-matter package key renamed (it names `crontick-dashboard`).
6. ADR 0006 records the rename (D6).
7. `git remote set-url origin https://github.com/tejitpabari99/tickdeck.git`.
8. Final task (after SP05): move folder, `git worktree repair`, update `/root/projects/README.md`.

## Architecture

### Inventory `[verified: git grep -i -o -h 'crontick[a-z_-]*' | sort | uniq -c]`
`crontick-dashboard` 204 · `crontick` 81 · `Crontick` 29 · `CRONTICK_DASHBOARD_HOME` 21 · `Crontick-Dashboard` 13 · `_PORT` 10 · `_VERBOSE` 8 · `crontick-style` 4 · `_UI_DIR` 3 · single: `crontick-hash`, `crontick-job`, `crontick-smoke-`. No tracked file or folder name contains it `[verified: git ls-files | grep -ic crontick → 0]`; `docs/agent_files/**` folder names are fine. By area: docs 52, schemas 13, src 13, tests 11, ui 10, scripts 4, root files (package*.json, README 9, SECURITY 3, AGENTS, CONTRIBUTING, RELEASING), `.changeset`.

### Rename map (apply top-down; longest first)
| Category | Old | New |
|---|---|---|
| Env vars | `CRONTICK_DASHBOARD_{HOME,PORT,UI_DIR,VERBOSE}` | `TICKDECK_{HOME,PORT,UI_DIR,VERBOSE}` |
| HTTP guard header | `X-Crontick-Dashboard` | `X-Tickdeck` |
| Windows AUMID | `Crontick.Dashboard` | `Tickdeck` |
| Package / bin / skill / data dir / `/api/health` `app` / `APP_NAME` | `crontick-dashboard` | `tickdeck` |
| Product name (UI title, header, `document.title`, docs prose) | `Crontick`, `Crontick-Dashboard`, "crontick dashboard" | `Tickdeck` |
| localStorage keys (`ui/src/constants/storage.ts`, 2 UI tests) | `crontick-dashboard.{theme,seen,filter,completed-open}` | `tickdeck.*` |
| Internal tokens | `crontick-hash`, `crontick-smoke-` | `tickdeck-hash`, `tickdeck-smoke-` |
| Schema titles (generated) | `crontick <type> card data` | `tickdeck <type> card data` (via script edit + regen) |
| Skill marker `<!-- crontick-dashboard@0.1.0 -->`, `name:` | | `tickdeck` |
| Scheduler refs: `crontick` bare, `crontick-style`, `crontick-job`, "crontick daemon/…", "crontick job" | | **manual**, D3 |

### Ordering
1. Scripted pass (`sed`/node) for the unambiguous rows above over `git ls-files`, excluding `package-lock.json` and `schemas/` and the redesign folder.
2. Manual pass over the scheduler references (~110 occurrences; find with `git grep -n -i 'crontick' | grep -v` after pass 1 — everything left is manual). Reword to the generic concept ("a scheduled agent job", "daemon pattern") or delete the clause.
3. Edit `scripts/schemas-build.ts`; `npm run gen:schemas`; `npm install --package-lock-only`.
4. Changeset + ADR 0006.
5. `npm run validate`, `npm run test:smoke`; verification greps.
6. Commit (one commit; message `01-rename: Task 1 — rename to Tickdeck`). Remote URL set separately.
7. **Final initiative task** (after SP05): `mv /root/projects/crontick-dashboard /root/projects/tickdeck`; `git -C /root/projects/tickdeck worktree repair /root/projects/tickdeck/.worktrees/<each>`; `git worktree list` shows new paths; update `/root/projects/README.md` row (line 18, which also says "crontick job outputs" — reword) and its folder column.

### Tests that assert old names (updated in pass 1)
`tests/cli/{assets,new,skill,validate}.test.ts`, `tests/skill/{acceptance,install,skill-md}.test.ts`, `tests/server/{http,paths-config}.test.ts` (`paths-config` regex on the env-paths dir), `tests/integrations/notify-adapter.test.ts`, `tests/smoke/smoke.spec.ts`, `ui/tests/{completed,filter}.test.tsx`.

### Scope of untracked paths
Out of scope: `node_modules`, `dist`, `ui/dist`, `.worktrees/`. After the pass, rebuild (`npm ci && npm run build`) so stale `dist/` does not mislead; they are gitignored so greps ignore them. Verification greps use `git grep` only.

### Worktrees
`git worktree list`: the main checkout (branch `main`) plus this worktree only `[verified]`. No other worktrees to repair. Branch `main` keeps the old name until this branch merges; `origin/main` likewise.

## Decisions
| # | Decision | Choice | Alternatives | Why |
|---|---|---|---|---|
| D1 | Env var prefix | `TICKDECK_*`, no old-name fallback | Read both | Owner: plain rename, nobody uses it |
| D2 | Data dir | env-paths follows `APP_NAME` → `.../tickdeck`; no migration/hint | Copy old dir; print hint | Owner decision; `[verified: ~/.local/share and ~/.config contain no crontick-dashboard dir]` so owner has nothing to lose today |
| D3 | Scheduler references | Reword to generic or delete (e.g. "crontick-style CLI" → "daemon-style CLI"); never substitute Tickdeck | Replace blindly; keep as is | Owner: no crontick references at all; blind replace makes false statements |
| D4 | Historical docs & ADRs | Rewritten like current docs (incl. `docs/agent_files/initial-brainstorming*`, ADR 0001/0003) | Freeze history | Owner: "all docs"; records stay readable, names are only labels |
| D5 | The redesign record itself (`docs/agent_files/tickdeck-redesign-20261014-1700/**`) | Excluded from the zero-match grep; it must name the old token to describe the rename | Obfuscate the old name | Briefs/PRDs cannot specify a rename without naming the source; a path exclusion is cheaper than contortion |
| D6 | ADR | New `0006-rename-to-tickdeck.md`: why, no migration, scheduler refs dropped, history rewritten in-tree only | No ADR | Lasting decision touching naming, data dir and env contract (house rule: ADRs for lasting decisions) |
| D7 | Changeset | `minor` for `tickdeck` (pre-1.0 breaking = minor per `check-changeset-bumps`); rename old changeset key | `major` (rejected by script on 0.x) | Keeps release tooling consistent; package key must match new name or changesets errors |
| D8 | Folder move | Last task of initiative, after SP05 | Do it first | Moving breaks absolute worktree paths mid-initiative |
| D9 | Git history | Untouched (old name remains in past commits) | Rewrite/filter-repo | Zero-reference goal is for the tree; rewriting is destructive and unrequested |
| D10 | localStorage keys | Renamed; saved filter/seen state resets once | Keep old keys | Part of "everything"; harmless |

## Manual steps (owner-only)
- Create/rename the GitHub repo to `tejitpabari99/tickdeck` (remote reachability is not verified or required here).
- Old data dir: none found on this machine today; if any exists elsewhere, delete it by hand.
- Out-of-repo references, listed not edited: `/root/.claude/projects/-root-projects-crontick-dashboard/` (session history keyed by path; a new key appears after the folder move), `/root/.claude/history.jsonl`; installed skill copies `~/.claude/skills/crontick-dashboard/` if ever created (none found in `~/.claude/skills`); any global `crontick-dashboard` binary (`which` → none); `/root/projects/README.md` row (handled in the final task). `/root/.local/share/crontick` and `/root/projects/crontick` belong to the scheduler, not this project.
- Re-run `tickdeck skill` to install the renamed skill if used.

## Risks / Open Questions
- [RESOLVED: D5 exclusion] Zero-match grep vs. redesign docs that name the old token.
- [RESOLVED: D3] Scheduler references: reword, not substitute.
- [RESOLVED: D2] Existing user data: none present.
- [RESOLVED: keep unscoped package name `tickdeck`; owner verified it is not on the npm registry (`npm install tickdeck` → E404; name-exists found nothing similar) (owner 2026-10-14)] `tickdeck` on npm; `release.yml`/`RELEASING.md` assume publishing.
- [DEFERRED] Sub-project 02 mockup and any private artifact titles may say "Tickdeck"; no coordination needed, new strings use Tickdeck.
- [DEFERRED] Merge to `main`: until this branch merges, `main` keeps the old name; no cross-branch work should start.
- Risk: sed hits inside `package-lock.json` integrity hashes or vendored text — mitigated by regenerating the lock and excluding it from the sed.
- Risk: a changed `X-Tickdeck` header or env var breaks a running old daemon's clients; accepted, nobody runs one.

## Acceptance Criteria
- `git grep -il crontick -- . ':!docs/agent_files/tickdeck-redesign-20261014-1700'` → 0 matches (also case variants `Crontick`, `CRONTICK_`).
- `git grep -c TICKDECK_` shows all four env vars used in `src/constants/env.ts`.
- `npm run validate` and `npm run test:smoke` pass; `npm run gen:schemas` leaves no diff.
- `npx tickdeck --help` (built bin) works; `tickdeck info` prints a data dir ending in `tickdeck`; `/api/health` returns `app: "tickdeck"`.
- `package.json` name and bin are `tickdeck`; `package-lock.json` consistent (`npm ci` succeeds).
- `git remote get-url origin` → `https://github.com/tejitpabari99/tickdeck.git`.
- ADR 0006 and a changeset exist.
- (Final task) `/root/projects/tickdeck` exists, `/root/projects/crontick-dashboard` does not, `git worktree list` paths valid, `projects/README.md` row updated.
