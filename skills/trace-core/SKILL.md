---
name: trace-core
description: Shared reference for all trace-me-if-you-can commands. Defines the trace.md memory format, Notion API patterns for the two-database (Backlog + AC) model, and secure token handling via TRACE_NOTION_TOKEN in .env. Load this before any /trace-* command touches trace.md or Notion.
---

# trace-core

Canonical reference used by every `/trace-*` command. trace.md is the persistent memory of the framework — its counterpart is GSD's `.planning/` directory. All commands read and write trace.md through the rules below.

## trace.md format

trace.md lives at the project root. It is machine-read and human-readable. Do not rewrite the whole file when one section changes; patch the specific section.

```markdown
# trace.md

Memory for trace-me-if-you-can. Framework: https://github.com/<owner>/trace-me-if-you-can

## Profile

- Notion User ID: <uuid-the-user-provided>
- Backlog DB ID: <32-char-hex-or-dashed>
- AC DB ID: <32-char-hex-or-dashed>

## Database Schemas

### Backlog DB — "<title from Notion>"
- <property name> (<type>)[: <comma-separated options for select/status>]
- ...

### AC DB — "<title from Notion>"
- <property name> (<type>)[: <options>]
- ...

## Progress Log

### YYYY-MM-DD
- <one-line summary of what changed locally>
- Synced to Backlog: <N created, M updated> — <page titles or IDs>
- Synced to AC: <N created, M updated> — <page titles or IDs>
- Skipped: <anything skipped and why>
```

### Section rules

- **Profile**: rewritten atomically by `/trace-profile` and `/trace-profile-change`. Never appended to.
- **Database Schemas**: captured by `/trace-profile`. Refreshed by `/trace` only when a Notion API response reveals a property that is not in trace.md.
- **Progress Log**: append-only. Newest entry goes on top (directly after the `## Progress Log` heading), so the most recent state is visible first.

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
| date | `{"date":{"start":"YYYY-MM-DD"}}` |
| checkbox | `{"checkbox":true}` |
| url | `{"url":"..."}` |
| number | `{"number":42}` |

### Error handling

- Capture `status` in the response JSON. Status `400` / `404` with `code: "object_not_found"` usually means the wrong ID (page vs database, or integration not shared to the DB).
- If `code: "unauthorized"`: token missing, invalid, or not shared to the target DB. Tell the user to re-share the integration with both databases.
- Never retry a 4xx automatically — surface the error message to the user verbatim.

## Token handling

- **Env var name:** `TRACE_NOTION_TOKEN`. Chosen explicitly to avoid collision with any project-level `NOTION_TOKEN`.
- **Location:** `.env` at project root.
- **Never print the token value** in any user-facing output. Say "present" or "missing" and nothing else about it.
- `/trace-profile` must append `.env` to `.gitignore` if a `.gitignore` exists and does not already list it. If there is no `.gitignore`, create one containing a single line: `.env`.

## Which DB is which?

Two separate databases by user decree:

- **Backlog DB** — tasks/requirements/work items the user plans, executes, or completes. Rows here represent *what is being built*. Status-like properties are expected (e.g. Backlog / In Progress / Done).
- **AC DB** — acceptance criteria tied to backlog items. Rows here represent *how we know something is done*. A relation/reference property back to the Backlog DB may or may not exist — do not assume.

When `/trace` has to decide where a new row belongs:
1. If the item describes behaviour that is checkable (starts with "user can", "system shall", "given/when/then", is a bullet under a feature heading): AC DB.
2. Otherwise (a task, a ticket, a chunk of work): Backlog DB.
3. If ambiguous, ask the user with AskUserQuestion rather than guess.

## Invariants enforced by all commands

1. `/trace` must refuse to run if trace.md does not exist — it is not a bootstrap command. Redirect to `/trace-profile`.
2. trace.md's Profile block is rewritten atomically. Never partially.
3. Progress Log is append-only and dated with `currentDate` from the session context. Do not fabricate dates.
4. No command prints the Notion token value. Ever.
5. `/trace-profile` never overwrites an existing trace.md without explicit user confirmation.
