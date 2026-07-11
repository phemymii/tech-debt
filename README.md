# Tech Debt

Interactive technical debt explorer for local codebases.

Scan a project for `TODO`, `FIXME`, and `@deprecated` comments, enrich them with git blame (author + age), and open a local dashboard to make buried debt actionable.

```bash
npx tech-debt
```

## Why

TODOs get buried and forgotten. Visualizing them by age, author, and file turns scattered comments into something you can prioritize and clear.

## Usage

```bash
# Scan the current directory and open the dashboard
npx tech-debt

# Point at another project
npx tech-debt --project ../my-app

# Print stats only (no UI)
npx tech-debt --scan-only

# Custom port / don't open browser
npx tech-debt --port 4600 --no-open
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

## What it finds

- `// TODO`, `// FIXME`, and block-comment variants
- `# TODO` / `# FIXME` (Python, Ruby, shell, etc.)
- `<!-- TODO -->` in HTML / Markdown
- `@deprecated` in JSDoc / doc comments

For each hit it records the message, file, line, and (when git is available) who last touched that line and when.

## Dashboard views

- **Overview** — counts, age buckets, kind breakdown
- **All debt** — searchable, filterable list
- **By author** — ownership of open debt
- **Hotspots** — files with the most markers
- **Inspector** — full comment context for a selected item

## Packages

| Package | Role |
|---------|------|
| `tech-debt` | CLI (`npx tech-debt`) |
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
