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

# CI: fail if debt grows past limits
npx @hollyman/tech-debt --max-items 200 --fail-on-ancient

# Machine-readable summary
npx @hollyman/tech-debt --scan-only --json
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

CI flags imply a scan-only run (you can omit `--scan-only`). Dismissed and snoozed items are excluded from open counts (and CI) by default.

## What it finds

- `TODO`, `FIXME`, `HACK`, `XXX`, `BUG` in `//`, `#`, `*`, and block comments
- `<!-- … -->` markers in HTML / Markdown (plus Markdown checklist lines)
- `@deprecated` in JSDoc / doc comments
- Ticket keys in messages (`ABC-123`, `#42`) and inline issue URLs

For each hit it records the message, file, line, tickets, and (when git is available) who last touched that line and when.

Deep-link Jira/Linear-style keys with:

```bash
TECH_DEBT_TICKET_BASE="https://linear.app/team/issue/{key}" npx @hollyman/tech-debt
```

GitHub `#123` links resolve from `origin` when it is a GitHub remote.

### Ignoring files

Scanning respects, in order (last match wins):

1. Built-in defaults (coverage, e2e, minified assets, **`.env` / secrets / keys**)
2. `.gitignore`
3. `.git/info/exclude`
4. `.tech-debtignore` (project overrides)

Dotfiles (including `.env*`) are never walked. Built-ins also skip common secret filenames (`secrets.yml`, `credentials.json`, `*.pem`, `id_rsa`, etc.), and **Open in editor** refuses those paths.

Copy `.tech-debtignore.example` to `.tech-debtignore` for project-specific paths:

```gitignore
src/generated/**
fixtures/**
!src/generated/keep.ts
```

## Dashboard views

- **Overview** — counts, age buckets, kind breakdown
- **All debt** — searchable, filterable list, including **My debt** (your `git config` user)
- **By author** — ownership of open debt
- **Hotspots** — files with the most markers
- **Docs** — browse and read project `.md` / `.mdx` files (README first)
- **Inspector** — full comment context, **Open in editor**, and local triage (dismiss / snooze)

### Local triage

From the Inspector you can **Dismiss** an item or **Snooze** it for 7 / 30 / 90 days. State lives in `.tech-debt/state.json` under the project root (commit it to share with the team, or gitignore for personal use). Use the **Triaged** chip on All debt to review and restore.

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

🚀 **Check out another project:** [Vexelloom Studio](https://vexelloom.com) — Free, private in-browser Image, Video & PDF toolkit with zero cloud uploads.

## License

MIT
