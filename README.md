# trace-me-if-you-can

A Claude Code plugin that keeps a local `trace.md` memory of your project and syncs progress to two Notion databases — a **Squad Backlog** (tasks / work items) and a **Squad AC** (acceptance criteria, linked back to Backlog rows).

Both databases use a fixed canonical column set — the plugin will refuse to set up against a database that's missing required columns or has the wrong types.

Manual-only, user-triggered. Inspired by [gsd](https://github.com/gsd-build/get-shit-done).

## Install

```
npx trace-me-if-you-can-cc@latest
```

That's it. One command, no Claude Code plugin marketplace dance. Re-run the same command any time to update. Restart Claude Code (or `/reload`) so the new `/trace-*` commands appear.

Installs at user level — `~/.claude/commands/` and `~/.claude/skills/trace-core/` — so the commands are available in every project.

To remove:

```
npx trace-me-if-you-can-cc@latest --uninstall
```

### Alternative: Claude Code plugin marketplace

If you prefer the native plugin flow (lets you manage it via `/plugin`):

```
/plugin marketplace add i4BSolutions/trace-me-if-you-can
/plugin install trace-me-if-you-can@trace-me-if-you-can
```

Pick one method — don't run both, you'll get duplicate commands.

## Commands

| Command | What it does |
|---|---|
| `/trace-profile` | First-run setup. Asks for your **project name**, Notion token, both database IDs, and your Notion user ID. Verifies the DBs against the canonical schemas, writes `trace.md`, stores the token in `.env`. |
| `/trace` | Re-scans the entire project, rewrites `trace.md`'s Project Snapshot, creates/updates rows in both Notion DBs, appends a dated entry to the Progress Log. Every run is a full refresh — `trace.md` is real-time with the docs and Notion. |
| `/trace-progress` | Read-only status report. Shows local memory summary + a live snapshot of both DBs. |
| `/trace-profile-check` | Show the active profile without making Notion calls. |
| `/trace-profile-change` | Swap the active Notion user ID (leaves token and DB IDs alone). |

## Files the plugin touches in your project

- `trace.md` — the memory file, at project root. Human-readable, machine-parsed.
- `.env` — stores `TRACE_NOTION_TOKEN`. The plugin ensures `.env` is in `.gitignore`.

The env var name is `TRACE_NOTION_TOKEN` (not `NOTION_TOKEN`) to avoid colliding with other Notion integrations you may already have in the same project.

## Notion requirements

1. Create a Notion internal integration. Copy its token.
2. Create (or pick) two databases in your workspace with these exact columns:

   **Squad Backlog**
   | Property | Type |
   |---|---|
   | Title | title |
   | Status | status |
   | Priority | status |
   | Project | select |
   | Epic | select |
   | Version | select |
   | Type | multi_select |
   | User Story | rich_text |
   | Develop By | people |
   | Create Time | created_time |

   **Squad AC**
   | Property | Type |
   |---|---|
   | ID | title |
   | Given | rich_text |
   | When | rich_text |
   | Then | rich_text |
   | Check | status |
   | User Story | relation → Squad Backlog |
   | Backlog Status | rollup (Status via User Story) |
   | Dev | rollup (Develop By via User Story) |
   | Project | rollup (Project via User Story) |
   | Epic | rollup (Epic via User Story) |

3. **Share both databases with the integration** (Notion → database → `...` → Connections → add your integration). Without this, every API call will 404 with `object_not_found`.
4. Add your **project name** as an option to the Backlog `Project` select before running `/trace-profile` — `/trace` will not auto-create select options.
5. Have your Notion user ID ready (Settings → Account → `…` → Copy link to profile → the UUID in the URL).

## How `trace.md` works

`trace.md` is the plugin's memory — the same idea as GSD's `.planning/` artifacts.

- **Profile** — project name, user ID, both DB IDs. Rewritten atomically.
- **Database Schemas** — locked to the canonical column lists above. `/trace-profile` captures titles + select option lists; `/trace` refreshes option lists if they drift.
- **Project Snapshot** — current Backlog and AC items with their Notion page IDs. Rewritten in full by every `/trace` run, so `trace.md` is always real-time.
- **Progress Log** — append-only, newest entry on top, dated.

`/trace` refuses to run without `trace.md`; that's by design — `/trace-profile` is the only bootstrap.

## Security

- The Notion token is written to `.env` and never echoed in any command's output.
- The plugin ensures `.env` is git-ignored.
- All API responses that fail are surfaced verbatim — no silent retries.

## License

MIT. Do what you want; no warranty.
