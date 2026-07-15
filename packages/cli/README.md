# Tech Debt

Interactive technical debt explorer for local codebases.

Scan a project for `TODO`, `FIXME`, `HACK`, `XXX`, `BUG`, and `@deprecated` comments, enrich them with git blame (author + age), and open a local dashboard to make buried debt actionable.

```bash
npx @hollyman/tech-debt
```

## Why

TODOs get buried and forgotten. Visualizing them by age, author, and file turns scattered comments into something you can prioritize and clear.

## Usage

```bash
# Scan the current directory and open the dashboard
npx @hollyman/tech-debt

# Point at another project
npx @hollyman/tech-debt --project ../my-app

# Print stats only (no UI)
npx @hollyman/tech-debt --scan-only

# Custom port / don't open browser
npx @hollyman/tech-debt --port 4600 --no-open

# CI gates (+ optional JSON)
npx @hollyman/tech-debt --max-items 200 --fail-on-ancient --json
```

Default UI: [http://localhost:4589](http://localhost:4589)

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `-p, --project <path>` | `cwd` | Project root to scan |
| `--port <number>` | `4589` | Dashboard port |
| `--no-open` | open on | Skip opening the browser |
| `--no-watch` | watch on | Disable live filesystem watching |
| `--scan-only` | off | Scan + print stats, then exit |
| `--no-blame` | blame on | Skip git blame (faster, no author/age) |
| `--json` | off | Print JSON summary (with scan-only / CI) |
| `--max-items <n>` | — | Exit 1 if total items exceed N |
| `--max-fixme <n>` | — | Exit 1 if FIXME count exceeds N |
| `--max-stale-days <n>` | — | Exit 1 if oldest blamed item is older than N days |
| `--fail-on-ancient` | off | Exit 1 if any ancient-age item exists |
| `--include-triaged` | off | Include dismissed/snoozed items in scan-only / CI |

CI flags imply a scan-only run. Triaged items are hidden from open counts by default (see `.tech-debt/state.json`).

## What it finds

- `TODO`, `FIXME`, `HACK`, `XXX`, `BUG` across common comment styles
- `@deprecated` in JSDoc / doc comments
- Ticket keys (`ABC-123`, `#42`) and issue URLs — set `TECH_DEBT_TICKET_BASE` for key deep links

For each hit it records the message, file, line, tickets, and (when git is available) who last touched that line and when.

### Ignoring files

Respects `.gitignore`, `.git/info/exclude`, and `.tech-debtignore` (last match wins), plus small built-in defaults for coverage / e2e / minified assets. See `.tech-debtignore.example`.

## Dashboard views

- **Overview** — counts, age buckets, kind breakdown
- **All debt** — searchable, filterable list, including **My debt** (git user)
- **By author** — ownership of open debt
- **Hotspots** — files with the most markers
- **Inspector** — context, open in editor, dismiss / snooze triage

### Open in editor

From the Inspector, **Open in editor** jumps to the debt marker (file + line) in your local editor. The server only opens paths under the scanned project root.

Override the editor with:

```bash
TECH_DEBT_EDITOR="cursor -g" npx @hollyman/tech-debt
```

Otherwise it tries Cursor / VS Code / Sublime CLIs, then the OS file opener. Terminal editors like vim are skipped so they do not open in the background.

## Packages

| Package | Role |
|---------|------|
| `@hollyman/tech-debt` | CLI (`npx @hollyman/tech-debt`) |
| `@tech-debt/core` | Comment scanner + git blame + aggregations |
| `@tech-debt/server` | Local Fastify API + embedded UI |
| `@tech-debt/web` | React dashboard (private; shipped inside server) |

## Development

```bash
npm install
npm run build
npm run tech-debt -- --project ../some-repo
```

During UI work:

```bash
# Terminal 1 — API on :4589
npm run tech-debt -- --project . --no-open

# Terminal 2 — Vite on :5173 (proxies /api and /ws)
npm run dev
```

## License

MIT
