---
description: Analyze project docs, update trace.md memory, and sync progress to the Notion Backlog + AC databases.
---

# /trace

The main sync command. Reads the codebase, updates local memory, and pushes changes to both Notion databases.

## Pre-flight

1. If `trace.md` does not exist at the project root: stop and tell the user to run `/trace-profile` first. Do not proceed.
2. Load the `trace-core` skill for trace.md format rules and Notion API shapes.
3. Read `.env` and extract `TRACE_NOTION_TOKEN`. If missing or empty: stop and tell the user to run `/trace-profile`. Do not attempt to use any other env var (e.g. `NOTION_TOKEN`) as a fallback.
4. Read `trace.md` fully into memory: Profile, DB Schemas (both), entire Progress Log.

## Work

5. **Discover project docs.** Look at the project root and known locations:
   - `README.md`, `PRD.md`, `Requirements*.md`, `CLAUDE.md`
   - `docs/**/*.md`, `.planning/**/*.md` if present
   - If the project uses GSD (`.planning/` present), also read `PROJECT.md`, `ROADMAP.md`, any `PLAN.md` / `SPEC.md` / `VERIFICATION.md` in active phase directories.
   
   Use Glob + Read. Do not read binary files.

6. **Understand current state.** Summarize internally (do not write to user yet):
   - What is the project about?
   - What are the current work items (features, tasks, phases)?
   - What are the current acceptance criteria (testable conditions, behaviours, gates)?
   - What is marked done / in-progress / not-started in the docs?

7. **Diff against trace.md Progress Log.** Determine what is new or changed since the last `/trace` entry. If this is the first `/trace` after `/trace-profile`, treat everything as new.

8. **Query Notion to avoid duplicates.** For both Backlog and AC databases, run the query curl from `trace-core`. Build two lookup tables keyed by the title of each existing page → its `id`.

9. **Classify each local item.** Using the rules in `trace-core` ("Which DB is which?"):
   - Tasks / work items / requirements → Backlog DB.
   - Testable behaviours / acceptance criteria → AC DB.
   - If ambiguous, ask the user with AskUserQuestion (options: "Backlog", "AC", "Skip").

10. **Sync.** For each item:
    - If a page with the same title exists in the target DB: PATCH it only if a property has actually changed. Do not issue no-op updates.
    - Otherwise: POST a new page. Required properties are inferred from the DB schema in trace.md; fill the title property at minimum. If the schema has a `people` property (commonly `Dev`, `Owner`, or `Assignee`), include the profile's Notion user ID in it.
    - If the schema has a `Claude Log` / `Claude Notes` rich_text property, append a brief note with today's date and what changed.
    - Report each sync as `[CREATED|UPDATED|SKIPPED] <db> — <title>` with a one-line reason for SKIPPED.

11. **Refresh schema if needed.** If any Notion response reveals a property not in trace.md's Database Schemas section, update that section in place (before the Progress Log). Do not touch other sections.

12. **Append to Progress Log.** Prepend a new dated entry (newest on top) to the Progress Log using `currentDate`. Format per `trace-core`:
    - One-line summary.
    - `Synced to Backlog: N created, M updated`.
    - `Synced to AC: N created, M updated`.
    - Anything skipped, and why.

## Report

13. Print a compact summary to the user:
    - What was analyzed (which doc files).
    - What was synced (counts + a few page titles).
    - What was skipped and why.
    - Any Notion API errors encountered, verbatim.

## Guardrails

- Never delete or archive Notion pages automatically. Only create and update.
- If a Notion API call fails: report the error, do not fall back silently, and do not write a Progress Log entry claiming success for that item.
- Preserve existing Progress Log entries verbatim — never rewrite history.
- Do not print the Notion token value in any message.
