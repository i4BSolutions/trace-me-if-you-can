# trace-me-if-you-can

A Claude Code plugin that keeps a local `trace.md` memory of your project and syncs progress to two Notion databases — a **Backlog DB** (tasks / work items) and an **AC DB** (acceptance criteria).

Manual-only, user-triggered. Inspired by [gsd](https://github.com/gsd-build/get-shit-done).

## Install (team distribution)

```
/plugin marketplace add i4BSolutions/trace-me-if-you-can
/plugin install trace-me-if-you-can@trace-me-if-you-can
```

Every teammate runs the same two commands — no extra setup. The plugin installs at user level, so the `/trace-*` commands are available in every project.

## Commands

| Command | What it does |
|---|---|
| `/trace-profile` | First-run setup. Asks for your Notion token, both database IDs, and your Notion user ID. Verifies the DBs, captures their schemas, writes `trace.md`, stores the token in `.env`. |
| `/trace` | Reads project docs, diffs against `trace.md`, creates/updates rows in both Notion DBs, appends a dated entry to the Progress Log. |
| `/trace-progress` | Read-only status report. Shows local memory summary + a live snapshot of both DBs. |
| `/trace-profile-check` | Show the active profile without making Notion calls. |
| `/trace-profile-change` | Swap the active Notion user ID (leaves token and DB IDs alone). |

## Files the plugin touches in your project

- `trace.md` — the memory file, at project root. Human-readable, machine-parsed.
- `.env` — stores `TRACE_NOTION_TOKEN`. The plugin ensures `.env` is in `.gitignore`.

The env var name is `TRACE_NOTION_TOKEN` (not `NOTION_TOKEN`) to avoid colliding with other Notion integrations you may already have in the same project.

## Notion requirements

1. Create a Notion internal integration. Copy its token.
2. Create (or pick) two databases in your workspace:
   - A **Backlog** database for tasks / work items.
   - An **Acceptance Criteria** database for testable conditions.
3. **Share both databases with the integration** (Notion → database → `...` → Connections → add your integration). Without this, every API call will 404 with `object_not_found`.
4. Have your Notion user ID ready (Settings → Account → `…` → Copy link to profile → the UUID in the URL).

## How `trace.md` works

`trace.md` is the plugin's memory — the same idea as GSD's `.planning/` artifacts.

- **Profile** — user ID, both DB IDs. Rewritten atomically.
- **Database Schemas** — captured by `/trace-profile`, refreshed by `/trace` on drift.
- **Progress Log** — append-only, newest entry on top, dated.

`/trace` refuses to run without `trace.md`; that's by design — `/trace-profile` is the only bootstrap.

## Security

- The Notion token is written to `.env` and never echoed in any command's output.
- The plugin ensures `.env` is git-ignored.
- All API responses that fail are surfaced verbatim — no silent retries.

## License

MIT. Do what you want; no warranty.
