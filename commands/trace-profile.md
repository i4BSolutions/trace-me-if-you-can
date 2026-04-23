---
description: Set up the trace-me-if-you-can profile — Notion token, Backlog + AC database IDs, and your Notion user ID. Writes trace.md.
---

# /trace-profile

Initialize (or reset) the user's trace profile. This is the bootstrap command — it MUST run before `/trace`.

## Steps

1. **Check existing state.**
   - If `trace.md` already exists in the current working directory, read it, show the user the current Profile section, and ask via AskUserQuestion: "Overwrite existing trace profile?" (options: "Overwrite", "Keep current and cancel"). If they pick Keep, stop and do nothing else.

2. **Gather credentials.** Ask the user for the following as plain text prompts (AskUserQuestion is unsuitable for free-form secrets/IDs — just ask the user to reply in chat). Ask them one message at a time, waiting for each reply:
   - **Notion integration token** (starts with `ntn_` or `secret_`).
   - **Backlog database ID** (32-char hex, with or without dashes).
   - **AC (Acceptance Criteria) database ID**.
   - **Their Notion user ID** — the user will provide this directly. Do not attempt to fetch it from `/v1/users`.

3. **Persist the token.**
   - Locate `.env` at the project root. If it does not exist, create it.
   - Set (or replace) the line `TRACE_NOTION_TOKEN=<token>`. Use Edit for replace, Write (append) for first-time.
   - Ensure `.env` is ignored by git: if `.gitignore` exists and `.env` is not already listed, append `.env` on a new line. If there is no `.gitignore`, create one containing `.env`.

4. **Verify both databases.** Load the `trace-core` skill for the exact curl shapes. For each DB ID, run:
   ```
   curl -s -H "Authorization: Bearer <the-token-just-entered>" \
        -H "Notion-Version: 2022-06-28" \
        "https://api.notion.com/v1/databases/<db-id>"
   ```
   For each response, capture:
   - The DB `title` (flattened from `title[*].plain_text`).
   - Every property name and type. For `select` / `status` / `multi_select`, also capture the option names.

   If either call returns an error object: surface the raw error, DELETE the token you just wrote to `.env`, and stop. Do not write trace.md with unverified IDs.

5. **Write trace.md.** Use the format defined in the `trace-core` skill. Populate:
   - Profile: user ID, Backlog DB ID, AC DB ID.
   - Database Schemas: both captured schemas, with titles.
   - Progress Log: a single entry dated with today's `currentDate`, text "Profile initialized. Backlog DB `<title>` and AC DB `<title>` verified."

6. **Report.** Print a compact summary:
   - Profile saved to `trace.md`.
   - Token saved to `.env` as `TRACE_NOTION_TOKEN` (do not print the token itself).
   - Backlog DB: `<title>` with N properties.
   - AC DB: `<title>` with N properties.
   - Tell the user they can now run `/trace` to sync progress.

## Guardrails

- Never echo the Notion token back in any message, even in summary.
- Never fabricate a user ID, DB title, or schema. If the Notion API did not return it, ask again.
- If the token, Backlog DB ID, or AC DB ID look obviously malformed (e.g. the user pasted a Notion URL), extract the ID or ask the user to repaste — do not guess.
