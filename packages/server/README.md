# @tech-debt/server

Local Fastify API and embedded web UI for Tech Debt.

## Open in editor

`POST /api/open` with body `{ path, line?, column? }` opens a file in the local editor.

- Paths are resolved under the project root (`realpath` + prefix check); escapes are rejected.
- Prefers `TECH_DEBT_EDITOR`, then `cursor` / `code` / `subl`, then OS openers.
- When `line` (and optionally `column`) are set, GUI CLIs receive `file:line:column`.
