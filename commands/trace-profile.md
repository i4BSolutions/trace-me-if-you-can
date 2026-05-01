---
description: Set up the trace-me-if-you-can profile — Project name, Notion token, Backlog + AC database IDs, and your Notion user ID. Writes trace.md.
---

# /trace-profile

Initialize (or reset) the user's trace profile. This is the bootstrap command — it MUST run before `/trace`.

## Steps

1. **Check existing state.**
   - If `trace.md` already exists in the current working directory, read it, show the user the current Profile section, and ask via AskUserQuestion: "Overwrite existing trace profile?" (options: "Overwrite", "Keep current and cancel"). If they pick Keep, stop and do nothing else.

2. **Gather inputs.** Ask the user for the following as plain text prompts (AskUserQuestion is unsuitable for free-form values — just ask the user to reply in chat). Ask one message at a time, waiting for each reply:
   - **Project name** — free text, e.g. "Squad Hub". This becomes the value for the Backlog `Project` (select) column on every page `/trace` creates.
   - **Notion integration token** (starts with `ntn_` or `secret_`).
   - **Backlog database ID** — the Squad Backlog DB (32-char hex, with or without dashes).
   - **AC database ID** — the Squad AC DB.
   - **Their Notion user ID** — the user will provide this directly. Do not attempt to fetch it from `/v1/users`.

3. **Persist the token.**
   - Locate `.env` at the project root. If it does not exist, create it.
   - Set (or replace) the line `TRACE_NOTION_TOKEN=<token>`. Use Edit for replace, Write (append) for first-time.
   - Ensure `.env` is ignored by git: if `.gitignore` exists and `.env` is not already listed, append `.env` on a new line. If there is no `.gitignore`, create one containing `.env`.

4. **Verify both databases against canonical schemas.** Load the `trace-core` skill for the canonical column lists and curl shape. For each DB ID, run:
   ```
   curl -s -H "Authorization: Bearer <the-token-just-entered>" \
        -H "Notion-Version: 2022-06-28" \
        "https://api.notion.com/v1/databases/<db-id>"
   ```
   For each response, capture:
   - The DB `title` (flattened from `title[*].plain_text`).
   - Every property name and type. For `select` / `status` / `multi_select`, also capture the option names. For `relation`, capture the related `database_id`. For `rollup`, capture the source property and rollup function.

   Then validate against the canonical schemas in `trace-core`:
   - **Backlog DB** must have: Title (title), Status (status), Priority (status), Project (select), Epic (select), Version (select), Type (multi_select), User Story (rich_text), Develop By (people), Create Time (created_time).
   - **AC DB** must have: ID (title), Given (rich_text), When (rich_text), Then (rich_text), Check (status), User Story (relation → Backlog DB), Backlog Status (rollup), Dev (rollup), Project (rollup), Epic (rollup).
   - The AC `User Story` relation's `database_id` must equal the Backlog DB ID provided.

   Verify the user-supplied **Project name** is one of the Backlog `Project` select options. If it is not, surface the available options and ask the user to either pick one or add the option in Notion and retry. Do not auto-create select options.

   If either DB call returns an error object, OR if any required property is missing, has the wrong type, or the AC `User Story` relation points elsewhere: surface the gap verbatim, DELETE the token you just wrote to `.env`, and stop. Do not write trace.md with an unverified or non-conforming profile.

5. **Write trace.md.** Use the format defined in the `trace-core` skill. Populate:
   - Profile: Project Name, Notion User ID, Backlog DB ID, AC DB ID.
   - Database Schemas: both DB titles plus the captured option lists for status/select/multi_select properties. Property rows match the canonical schema exactly — do not list extra non-canonical properties.
   - Project Snapshot: empty section with `Last refreshed: <currentDate>` and empty `### Backlog items` / `### Acceptance criteria` lists.
   - Progress Log: a single entry dated with today's `currentDate`, text "Profile initialized for project `<Project Name>`. Backlog DB `<title>` and AC DB `<title>` verified against canonical schemas."

6. **Report.** Print a compact summary:
   - Profile saved to `trace.md`.
   - Project name: `<Project Name>`.
   - Token saved to `.env` as `TRACE_NOTION_TOKEN` (do not print the token itself).
   - Backlog DB: `<title>` — canonical schema verified.
   - AC DB: `<title>` — canonical schema verified, relation links back to Backlog.
   - Tell the user they can now run `/trace` to sync progress.

## Guardrails

- Never echo the Notion token back in any message, even in summary.
- Never fabricate a user ID, DB title, schema, or select option. If the Notion API did not return it, ask again.
- If the token, Backlog DB ID, or AC DB ID look obviously malformed (e.g. the user pasted a Notion URL), extract the ID or ask the user to repaste — do not guess.
- Do not auto-create missing properties or select options in Notion. The user owns the schema; this command only verifies it.
