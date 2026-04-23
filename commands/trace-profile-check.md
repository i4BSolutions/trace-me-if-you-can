---
description: Show the active trace profile — user ID, both database IDs, and whether the token is set.
---

# /trace-profile-check

Read-only profile inspection. Quicker than `/trace-progress` — no Notion calls.

## Steps

1. If `trace.md` does not exist: tell the user to run `/trace-profile` and stop.
2. Read `trace.md` and extract the Profile section.
3. Read `.env` at project root. Note only whether `TRACE_NOTION_TOKEN` is present (never print its value).
4. **Report**:

   ```markdown
   # trace profile

   - Notion User ID: <uuid>
   - Backlog DB ID: <id>  (schema: "<title>" captured)
   - AC DB ID: <id>  (schema: "<title>" captured)
   - TRACE_NOTION_TOKEN: <present|missing>
   ```

5. If the token is missing, add a one-liner: "Run `/trace-profile` to restore the token."
6. If the user wants to change the user ID, remind them of `/trace-profile-change`.

## Guardrails

- No Notion API calls.
- No writes anywhere.
- Never print the token value.
