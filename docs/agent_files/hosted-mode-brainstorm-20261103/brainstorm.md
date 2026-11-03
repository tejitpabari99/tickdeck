---
status: draft
summary: Brainstorm — making tickdeck usable by non-technical users (e.g. nonprofits) with only free tools and their existing AI subscriptions, alongside the developer self-host path.
date: 2026-11-03
---

# tickdeck for others — hosted (no-code) and self-host brainstorm

Planning artifact, not normative. Builds on the 0.1.0 implementation in PR #1 (`initial-brainstorming` branch).

## 1. TL;DR

- The product is the **card contract** (`card.json` + `data.json`, alert files). Where cards are stored, where the page is hosted, and what writes the cards should be pluggable.
- **Two branches:**
  - **Self-host (developers):** PR #1 already covers it (npm CLI, local feed folder). Add a Docker image and a documented way to reach it remotely (e.g. Tailscale).
  - **Hosted (non-technical, e.g. a nonprofit):** one static site you host (free: GitHub Pages / Cloudflare Pages) + data in the **user's own Google Drive**. No server, no install, no data held by us.
- **Writers:** Claude and ChatGPT scheduled tasks can write to Google Drive directly. Grok and Perplexity are unconfirmed, so they fall back to an Apps Script (free Gemini) or email-in.
- **Key design rule:** the website creates the card files in the user's Drive; the AI only *updates* those existing files. This keeps us on Google's free `drive.file` scope and avoids a paid security review.

## 2. Non-technical user journey

1. Go to the tickdeck site.
2. Click **Sign in with Google**. tickdeck creates a `Tickdeck/` folder in their Drive.
3. Dashboard shows a sample card and **Add your first widget**.
4. Pick a widget, e.g. "Daily email summary". The site creates `Tickdeck/feed/email-summary/card.json` + an empty `data.json`, then walks them through one of:
   - **Claude / ChatGPT:** "Open Claude/ChatGPT → paste this prompt → schedule daily at 7am." The prompt tells the AI to overwrite that existing `data.json` with the card format.
   - **No AI subscription (or Grok / Perplexity):** "Click Install" — an Apps Script in their own account summarizes Gmail with free Gemini and writes the card.
5. Each morning they open the site and the cards are there.

Why: free for them and nearly free for us; their data never touches our servers; updating the site updates everyone; no servers, installs, or GitHub account.

## 3. Writer capability check (as of 2026-11-03)

| Assistant | Can write to Drive? | Can a scheduled run do it unattended? |
|---|---|---|
| Claude | Yes — official help: save files / create folders in Drive (needs code execution + file creation on) | Likely — scheduled tasks run in the cloud with connectors. Risk: a mid-run approval prompt stalls the run |
| ChatGPT | Yes — official help lists create/update Drive actions; may ask to confirm; admin-gated on Business/Enterprise | Probably — third-party guides citing OpenAI say tasks can use connected apps. Plus = 5 active tasks, ≥ hourly; Free unclear |
| Grok | Yes — xAI docs: Drive connector can create/modify files with optional write scope | Not found |
| Perplexity | Built-in Drive connector appears read-only; custom MCP connectors on paid plans may write | Not found |

Most "unattended" answers come from secondary sources; only a real test settles it (§7).

Fallback ladder for writers, easiest to most capable:
1. Email-in: the AI's scheduled task emails the result; an Apps Script on a Gmail timer turns it into a markdown card.
2. Apps Script "recipes" using free Gemini (caveat: free tier may use data for training — matters for sensitive email).
3. Direct Drive / Sheet writes (Claude, ChatGPT; also Zapier/Make, GPT Actions → Apps Script `doPost`).
4. A tickdeck MCP server with a `write_card` tool (needs a hosted service with auth; later).

## 4. Storage: JSON files vs. Google Sheet

- **Default: keep JSON files**, mirroring the local feed exactly (`Tickdeck/feed/<id>/{card.json,data.json}`). Same contract, same templates, same skill concept.
- **Fallback: a Google Sheet** holding the same JSON in cells (`id | card JSON | data JSON`), if AI connectors can't reliably edit plain `.json` files in place (they are better with Docs/Sheets, and may create a duplicate file instead of updating). Cell limit ~50,000 characters.

## 5. Google access and the security review

- `drive.file` (free, no paid review) only covers files the app **created** or the user **picked** in Google Picker. Access survives edits by other apps.
- There is **no folder-scoped permission**. Picking a folder grants the folder itself; access to its children is undocumented and reportedly not granted; files added later are not covered.
- `drive.readonly` / `drive` are restricted scopes → paid CASA assessment, renewed yearly (vendors quote ~$500–$4,500/yr; free self-scan reportedly closed).

| Approach | Review | Downside |
|---|---|---|
| **Website creates files, AI updates them** (chosen) | Free brand verification only | AI must edit in place — needs test |
| Apps Script copied into user's own account | None | "Google hasn't verified this app" warning; bad for nonprofits |
| Pay for CASA | Yes | Cost, paperwork |
| OAuth "testing" mode | No | 100 manual test users; tokens expire every 7 days |

## 6. Fit with the current code (PR #1)

Mostly portable already:
- UI talks to the server through a small `Client` interface (`ui/src/api/client.ts`): one snapshot read + tick alert, Done/Reopen, hide, item action.
- `src/compute/snapshot.ts` is pure; only `node:crypto` `createHash` (for the rev tag) blocks running it in the browser.
- The contract is zod — browser-safe.

Local-only, stays in self-host mode: file watcher, `state.json` store, `data.json` write-back, OS notifications, CLI.

Hosted mode = a second `Client` implementation that reads/writes Drive and runs compute in the browser. Hosted notifications become Web Push or email. The `complete` write-back design (flag in `data.json`, agent acts next run) carries over unchanged.

**Tenet conflict:** `docs/tech/mission.md` tenet 1 (local-first, no cloud service), tenet 2 (no push API), and the non-goal "not multi-user or network-exposed". Needs an ADR before building, e.g. "two storage backends; local stays default; hosted means the user's own Google account, never a shared server we run".

## 7. Riskiest assumptions → cheapest tests

| Assumption | Test |
|---|---|
| Claude scheduled task can overwrite an existing `data.json` in Drive in place, unattended | One scheduled Claude task; check file id unchanged and the site still reads it |
| Same for ChatGPT | One scheduled ChatGPT task; watch for confirmation prompts |
| Website keeps `drive.file` access after another app edits the file | Minimal page: sign in, create file, read after external edit |
| Apps Script + free Gemini can produce a valid email-summary card | 30-line script on a timer |
| Non-technical users finish setup | Watch one real nonprofit person try it |

## 8. Suggested order

1. Land PR #1 as the self-host release.
2. Small refactor: drop `node:crypto` from compute; put the server-side store behind an interface (snapshot + the five mutations).
3. Write the ADR for the tenet change.
4. Run the tests in §7.
5. Build hosted mode: static site, Drive-backed `Client`, setup page with per-widget recipes (paste-in prompts for ChatGPT/Claude, Apps Script installs), Web Push/email notifications.
6. Later: tickdeck MCP server.

## Sources

- [Anthropic: Use Google Workspace connectors](https://support.claude.com/en/articles/10166901-use-google-workspace-connectors)
- [Claude Cowork scheduled tasks setup](https://heraiempire.substack.com/p/claude-cowork-now-runs-your-scheduled)
- [Green Flag Digital: Claude Cowork + Google Drive](https://greenflagdigital.com/learning-ai/claude-cowork-google-drive/)
- [OpenAI: Google Drive app and setup in ChatGPT](https://help.openai.com/en/articles/10929079-google-drive-app-and-setup-in-chatgpt)
- [OpenAI: Managing Google Drive access in ChatGPT](https://help.openai.com/en/articles/20001608-managing-google-drive-access-in-chatgpt)
- [Carly: ChatGPT scheduled tasks in 2026](https://www.usecarly.com/blog/chatgpt-scheduled-tasks/)
- [PortEden: ChatGPT scheduled tasks with tools and connectors](https://porteden.com/blog/chatgpt-scheduled-tasks-tools/)
- [xAI: Grok Google Drive connector](https://docs.x.ai//grok/connectors/google-drive)
- [Fast.io: Perplexity + Google Drive](https://fast.io/resources/perplexity-google-drive/)
- [Hjarni: Connect Perplexity to an MCP server](https://hjarni.com/docs/connect-perplexity-mcp)
- [Google Apps Script community: drive.file scope](https://groups.google.com/g/google-apps-script-community/c/_W-NKbttfbo/m/DieCBbNHBQAJ)
- [calibre-cloud #156: picking a folder under drive.file](https://github.com/shitikanth/calibre-cloud/issues/156)
- [Nylas: Google OAuth verification costs](https://www.nylas.com/?p=1231)
- [DeepStrike: Google CASA assessment](https://deepstrike.io/blog/google-casa-security-assessment-2025)
