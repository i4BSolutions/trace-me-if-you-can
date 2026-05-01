---
description: Show what trace-me-if-you-can knows about this project and a snapshot of both Notion databases.
---

# /trace-progress

Read-only status report. Does not write anywhere.

## Steps

1. If `trace.md` does not exist: tell the user to run `/trace-profile` and stop.
2. Load the `trace-core` skill.
3. Read `trace.md` and extract:
   - Profile: Project Name, user ID, Backlog DB ID, AC DB ID.
   - Last Progress Log entry (date + body).
   - Total number of Progress Log entries.
   - Database schema titles.
   - Project Snapshot `Last refreshed` date and counts of Backlog items and AC items.
4. Read `.env`. Note only whether `TRACE_NOTION_TOKEN` is present (never print its value).
5. If the token is present, query both databases (see `trace-core` for the curl shape). For each:
   - Count total items returned.
   - If the schema has a `Status` or `status`-type property, tally counts per status option.
6. If the token is missing, skip step 5 and flag that live counts are unavailable.
7. **Report** as a single compact markdown block:

   ```markdown
   # trace-progress

   **Profile** · project `<Project Name>` · user `<short-uuid>…` · Backlog DB `<id>` · AC DB `<id>` · token: <present|missing>

   **Backlog DB — <title>**: <total> items
   - <status option>: <count>
   - ...

   **AC DB — <title>**: <total> items
   - <Check option>: <count>
   - ...

   **Local snapshot** · refreshed <date> · Backlog items: <N> · AC items: <M>

   **Last sync** · <date>
   > <summary line from last Progress Log entry>

   **Progress Log entries:** <N>

   **Next action:** <one of — "run /trace to sync recent changes" | "no sync yet — run /trace" | "token missing — run /trace-profile">
   ```

## Guardrails

- Read-only. Do not write to trace.md, .env, or Notion.
- Never print the token value. Only `present` or `missing`.
- If a Notion query fails, show the error inline in the report; do not abort the whole report.
