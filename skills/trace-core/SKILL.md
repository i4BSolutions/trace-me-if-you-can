---
name: trace-core
description: Shared reference for all trace-me-if-you-can commands. Defines the trace.md memory format, canonical Squad Backlog + Squad AC schemas, Notion API patterns, and secure token handling via TRACE_NOTION_TOKEN in .env. Load this before any /trace-* command touches trace.md or Notion.
---

# trace-core

Canonical reference used by every `/trace-*` command. trace.md is the persistent memory of the framework — its counterpart is GSD's `.planning/` directory. All commands read and write trace.md through the rules below.

## trace.md format

trace.md lives at the project root. It is machine-read and human-readable. Patch the specific section that changed; do not rewrite the whole file unless the rules below say so.

```markdown
# trace.md

Memory for trace-me-if-you-can. Framework: https://github.com/i4BSolutions/trace-me-if-you-can

## Profile

- Project Name: <name from /trace-profile>
- Notion User ID: <uuid-the-user-provided>
- Backlog DB ID: <32-char-hex-or-dashed>
- AC DB ID: <32-char-hex-or-dashed>

## Database Schemas

### Backlog DB — "<title from Notion>"
- Title (title)
- Status (status): <comma-separated options captured from Notion>
- Priority (status): <options>
- Project (select): <options>
- Epic (select): <options>
- Version (select): <options>
- Type (multi_select): <options>
- User Story (rich_text)
- Develop By (people)
- Create Time (created_time)

### AC DB — "<title from Notion>"
- ID (title)
- Given (rich_text)
- When (rich_text)
- Then (rich_text)
- Check (status): <options>
- User Story (relation → Backlog DB)
- Backlog Status (rollup: Status via User Story)
- Dev (rollup: Develop By via User Story)
- Project (rollup: Project via User Story)
- Epic (rollup: Epic via User Story)

## Project Snapshot

Last refreshed: <YYYY-MM-DD>

### Backlog items
- <Title> — <Status> — <Project> — <Epic> — notion: <page-id-or-"unsynced">
- ...

### Acceptance criteria
- <ID> — <Check> — story: <Backlog Title or "unlinked"> — notion: <page-id-or-"unsynced">
- ...

## Progress Log

### YYYY-MM-DD
- <one-line summary of what changed locally>
- Synced to Backlog: <N created, M updated> — <page titles or IDs>
- Synced to AC: <N created, M updated> — <page titles or IDs>
- Skipped: <anything skipped and why>
```

### Section rules

- **Profile**: rewritten atomically by `/trace-profile`. `/trace-profile-change` may patch the Notion User ID line in place. Never appended to.
- **Database Schemas**: locked to the canonical schemas below. `/trace-profile` captures the exact title + select/status/multi_select option lists from Notion and writes them. `/trace` may refresh option lists if Notion adds new options, but never adds or removes property rows — those are fixed.
- **Project Snapshot**: rewritten in full by every `/trace` run. This section reflects the current state of the project (post-scan) and the most recent Notion page IDs. It is not history — the Progress Log is.
- **Progress Log**: append-only. Newest entry goes on top (directly after the `## Progress Log` heading), so the most recent state is visible first.

## Canonical schemas

Both databases have a fixed column set. `/trace-profile` MUST verify each property name exists with the expected type. If any required property is missing or has the wrong type, stop and tell the user — do not write trace.md and do not save the token. Extra properties beyond the canonical set are tolerated but ignored by all `/trace-*` commands.

### Squad Backlog (Backlog DB)

| Property | Type | Source when writing |
|---|---|---|
| Title | title | Item title from local docs |
| Status | status | Best-effort from doc state ("done"/"in progress"/"todo") — leave unset if unknown |
| Priority | status | Leave unset unless explicit in source doc |
| Project | select | **Profile's Project Name** (constant per project) |
| Epic | select | Best-effort from heading/parent section — leave unset if unknown |
| Version | select | Leave unset unless explicit in source doc |
| Type | multi_select | Best-effort (e.g. "Feature", "Bug", "Chore") — leave unset if unknown |
| User Story | rich_text | One-paragraph description / "As a … I want … so that …" if available |
| Develop By | people | Profile's Notion User ID |
| Create Time | created_time | Notion-managed, never written by the client |

### Squad AC (Acceptance Criteria DB)

| Property | Type | Source when writing |
|---|---|---|
| ID | title | Stable AC identifier, e.g. `AC-001`, or `<backlog-slug>-AC-01` |
| Given | rich_text | "Given …" clause |
| When | rich_text | "When …" clause |
| Then | rich_text | "Then …" clause |
| Check | status | Leave unset unless explicit; do not assume "passed" |
| User Story | relation → Backlog DB | Page ID of the parent Backlog item |
| Backlog Status | rollup | Notion-managed, never written by the client |
| Dev | rollup | Notion-managed, never written by the client |
| Project | rollup | Notion-managed, never written by the client |
| Epic | rollup | Notion-managed, never written by the client |

When syncing, never send values for `created_time` or `rollup` properties — Notion rejects them.

## Notion API

- Base: `https://api.notion.com/v1`
- Headers (every call): `Authorization: Bearer $TRACE_NOTION_TOKEN`, `Notion-Version: 2022-06-28`, `Content-Type: application/json` (on POST/PATCH).

### Endpoints

| Action | Method | Path |
|---|---|---|
| Describe DB | GET | `/databases/<db-id>` |
| Query DB | POST | `/databases/<db-id>/query` |
| Create page | POST | `/pages` |
| Update page | PATCH | `/pages/<page-id>` |

### Canonical curl shapes

Describe a DB and capture schema:

```bash
curl -s \
  -H "Authorization: Bearer $TRACE_NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  "https://api.notion.com/v1/databases/<db-id>"
```

Query a DB (newest first, 100 items):

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TRACE_NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"page_size":100,"sorts":[{"timestamp":"last_edited_time","direction":"descending"}]}' \
  "https://api.notion.com/v1/databases/<db-id>/query"
```

Create a page in a DB:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TRACE_NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"parent":{"database_id":"<db-id>"},"properties":{ ... }}' \
  "https://api.notion.com/v1/pages"
```

Update a page:

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer $TRACE_NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"properties":{ ... }}' \
  "https://api.notion.com/v1/pages/<page-id>"
```

### Property value shapes

| Type | Shape |
|---|---|
| title | `{"title":[{"text":{"content":"..."}}]}` |
| rich_text | `{"rich_text":[{"text":{"content":"..."}}]}` |
| select | `{"select":{"name":"<option>"}}` |
| status | `{"status":{"name":"<option>"}}` |
| multi_select | `{"multi_select":[{"name":"<option>"}]}` |
| people | `{"people":[{"id":"<user-id>"}]}` |
| relation | `{"relation":[{"id":"<page-id>"}]}` |
| date | `{"date":{"start":"YYYY-MM-DD"}}` |
| checkbox | `{"checkbox":true}` |
| url | `{"url":"..."}` |
| number | `{"number":42}` |

`created_time` and `rollup`: read-only — never include in the `properties` payload.

### Error handling

- Capture `status` in the response JSON. Status `400` / `404` with `code: "object_not_found"` usually means the wrong ID (page vs database, or integration not shared to the DB).
- If `code: "unauthorized"`: token missing, invalid, or not shared to the target DB. Tell the user to re-share the integration with both databases.
- If `code: "validation_error"` mentions an option that does not exist on a `select`/`status`/`multi_select`: do NOT auto-create the option. Skip that property on the write, log it under "Skipped" in the Progress Log, and tell the user to add the option in Notion.
- Never retry a 4xx automatically — surface the error message to the user verbatim.

## Token handling

- **Env var name:** `TRACE_NOTION_TOKEN`. Chosen explicitly to avoid collision with any project-level `NOTION_TOKEN`.
- **Location:** `.env` at project root.
- **Never print the token value** in any user-facing output. Say "present" or "missing" and nothing else about it.
- `/trace-profile` must append `.env` to `.gitignore` if a `.gitignore` exists and does not already list it. If there is no `.gitignore`, create one containing a single line: `.env`.

## Which DB is which?

Two separate databases by user decree:

- **Squad Backlog** — tasks/requirements/work items. Rows here represent *what is being built*. One row per discrete unit of work.
- **Squad AC** — acceptance criteria tied to backlog items. Rows here represent *how we know something is done*. Every AC row should set the `User Story` relation to its parent Backlog page.

When `/trace` has to decide where a new row belongs:
1. If the item is phrased as Given/When/Then, or is a checkable behavior bullet under a feature/task heading: AC DB. Link via `User Story` relation to the parent Backlog page.
2. Otherwise (a task, a ticket, a chunk of work, a feature): Backlog DB.
3. If ambiguous, ask the user with AskUserQuestion rather than guess.

## Real-time refresh contract

Every `/trace` run is a full re-scan, not an incremental delta:

1. Re-read every project doc from scratch — do not trust trace.md's prior snapshot as the source of truth for what exists locally.
2. Rebuild the in-memory list of Backlog items and AC items from the docs.
3. Compare against Notion (via Query DB) and against trace.md's prior `Project Snapshot`.
4. Write Notion (create/update only — never delete or archive).
5. Rewrite the `## Project Snapshot` section in full to reflect post-sync reality.
6. Append one entry to `## Progress Log` summarizing the run.

trace.md is therefore eventually consistent with the docs and Notion after each `/trace` call. Stale items in trace.md's old snapshot are corrected by the rewrite; nothing in the Progress Log is rewritten.

## Invariants enforced by all commands

1. `/trace` must refuse to run if trace.md does not exist — it is not a bootstrap command. Redirect to `/trace-profile`.
2. trace.md's Profile block is rewritten atomically. Never partially (except `/trace-profile-change` patching the User ID line).
3. Database Schemas section follows the canonical schemas. Property rows are fixed; only option lists may be refreshed.
4. Project Snapshot is rewritten by every `/trace` run; Progress Log is append-only and dated with `currentDate` from the session context. Do not fabricate dates.
5. No command prints the Notion token value. Ever.
6. `/trace-profile` never overwrites an existing trace.md without explicit user confirmation.
7. No command sends values for `created_time` or `rollup` properties to Notion.
