# tickdeck

Local dashboard for agent-written cards: scheduled jobs (e.g. cron-driven agent runs) or any script write small JSON files into a feed directory, and a local web UI lays them out in three columns as tables, lists, KPIs, markdown, and media, with one-line alerts and optional OS notifications.

One npm package (Node >= 22.5): a loopback-only server, a React UI, and the `tickdeck` CLI. Version 0.1.0.

## Install

```sh
npm i -g tickdeck      # once published
npm i -g .                       # from a clone (run `npm ci && npm run build` first)
```

## Quick start

```sh
tickdeck daemon start            # or: tickdeck start  (foreground)
tickdeck info                    # URL and feed dir
tickdeck new hello --type markdown --title Hello   # scaffolds <feedDir>/hello/card.json
```

A card is a folder: `card.json` says how it looks (type, title, column) and is written once; `data.json` holds the content and is rewritten on every run. Write `<feedDir>/hello/data.json`:

```json
{ "data": { "text": "It works." } }
```

Check the whole folder with `tickdeck validate <feedDir>/hello`, then open the URL from `info` in a browser. Until `data.json` exists the card shows "No data yet". An alert is a single line in `<feedDir>/alerts/<id>.json`, for example `{ "title": "Disk almost full", "text": "92% used" }`. Stop with `tickdeck daemon stop`.

Default port: 47616 (falls back to a free port if taken; `info` prints the real URL).

To teach Claude agents to write cards: `tickdeck skill install`. `tickdeck templates <type>` prints a ready-made `card.json` and `data.json` for each type.

## Documentation

- [docs/README.md](docs/README.md): full index (concepts, reference, decisions)
- Reference: CLI, configuration, card schema, HTTP API, errors in [docs/reference/](docs/reference/); problems in [docs/troubleshooting.md](docs/troubleshooting.md)
- [AGENTS.md](AGENTS.md): repository guide for coding agents
- [CONTRIBUTING.md](CONTRIBUTING.md): how to contribute
