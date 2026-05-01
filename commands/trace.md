---
description: Re-scan the entire project, refresh trace.md (Database Schemas + Project Snapshot), and sync to the Notion Squad Backlog and Squad AC databases using the canonical column set.
---

# /trace

The main sync command. Every run is a full re-scan — `trace.md` is rewritten end-to-end (except the append-only Progress Log) so it stays real-time with the project and with Notion.

## Pre-flight

1. If `trace.md` does not exist at the project root: stop and tell the user to run `/trace-profile` first. Do not proceed.
2. Load the `trace-core` skill for trace.md format rules, canonical schemas, and Notion API shapes.
3. Read `.env` and extract `TRACE_NOTION_TOKEN`. If missing or empty: stop and tell the user to run `/trace-profile`. Do not attempt to use any other env var (e.g. `NOTION_TOKEN`) as a fallback.
4. Read `trace.md` fully into memory: Profile (incl. Project Name), Database Schemas, prior Project Snapshot, entire Progress Log.

## Re-scan project (every run, in full)

5. **Discover project docs.** Glob fresh from the file system — do not rely on any prior list. Look at:
   - `README.md`, `PRD.md`, `Requirements*.md`, `CLAUDE.md` at the root.
   - `docs/**/*.md`, `.planning/**/*.md` if present.
   - If the project uses GSD (`.planning/` present), also read `PROJECT.md`, `ROADMAP.md`, every `PLAN.md` / `SPEC.md` / `VERIFICATION.md` in active phase directories.

   Use Glob + Read. Skip binary files.

6. **Rebuild the item lists from scratch.** Do not diff against trace.md to decide what exists locally — trace.md's prior snapshot is informational only. From the docs, build two fresh lists:
   - **Backlog items** — features, tasks, requirements, work items. Each has: Title, optional User Story text, best-effort Status / Priority / Epic / Version / Type. Project is always the profile's Project Name.
   - **AC items** — Given/When/Then bullets, checkable behavior statements, "user can …" / "system shall …" lines. Each has: ID (stable identifier), Given, When, Then, optional Check status, and the parent Backlog item title.

   Classification rule (from `trace-core`): Given/When/Then or behavior-bullet → AC; everything else that is a unit of work → Backlog. If ambiguous, ask the user with AskUserQuestion (options: "Backlog", "AC", "Skip").

## Refresh schemas (option lists only)

7. **GET both databases** using the curl shape in `trace-core`. For each, capture current option lists for `status` / `select` / `multi_select` properties. If any option list in trace.md's Database Schemas section is out of date, patch only those option lines in place. Do not add or remove property rows — the canonical schema from `trace-core` is fixed; if a canonical property is missing in Notion, surface the error and stop.

## Query Notion to avoid duplicates

8. **Query both databases** to build lookup tables:
   - Backlog: keyed by `Title` (the title property's plain text) → `id`.
   - AC: keyed by `ID` (the title property's plain text) → `id`.

## Sync — Backlog first, then AC

9. **Backlog sync.** For each local Backlog item:
   - Build properties using only the canonical writable columns:
     - `Title` (title) — required.
     - `User Story` (rich_text) — if available.
     - `Project` (select) — set to the profile's Project Name. If that option does not exist in Notion's option list, skip this property and log under "Skipped".
     - `Develop By` (people) — set to `[{"id": "<profile user id>"}]`.
     - `Status`, `Priority`, `Epic`, `Version`, `Type` — only include if you have a confident value AND the value matches an existing option in Notion. Never auto-create options.
   - Never include `Create Time` (Notion-managed).
   - If a page with the same Title exists: PATCH only properties whose values differ. Skip no-op updates.
   - Otherwise: POST a new page.
   - Record the resulting `page-id` against the local item — needed in step 10 for the AC relation.
   - Report each as `[CREATED|UPDATED|SKIPPED] Backlog — <title>` with a one-line reason for SKIPPED.

10. **AC sync.** For each local AC item:
    - Resolve the parent Backlog page id from step 9 (or, if the parent already existed in Notion, from the lookup table in step 8). If the parent cannot be resolved, skip the AC and log it under "Skipped: AC `<id>` — parent backlog item not found".
    - Build properties using only the canonical writable columns:
      - `ID` (title) — required.
      - `Given`, `When`, `Then` (rich_text) — include each if available.
      - `Check` (status) — only if explicit in the source doc.
      - `User Story` (relation) — `[{"id": "<parent backlog page id>"}]`.
    - Never include `Backlog Status`, `Dev`, `Project`, `Epic` — those are rollups, Notion-managed.
    - If a page with the same `ID` exists: PATCH only differing properties. Skip no-op updates.
    - Otherwise: POST a new page.
    - Report each as `[CREATED|UPDATED|SKIPPED] AC — <id>`.

## Rewrite trace.md

11. **Rewrite the Project Snapshot section in full** with `Last refreshed: <currentDate>` and the post-sync state of every Backlog item and AC item, including each item's Notion `page-id` (or `unsynced` if the sync was skipped). This section is overwritten every run.

12. **Patch Database Schemas option lists** if step 7 found drift. Property rows stay fixed.

13. **Append to Progress Log.** Prepend a new dated entry (newest on top) using `currentDate`. Format per `trace-core`:
    - One-line summary.
    - `Synced to Backlog: N created, M updated`.
    - `Synced to AC: N created, M updated`.
    - Anything skipped, and why.

    Never edit prior Progress Log entries.

## Report

14. Print a compact summary to the user:
    - What was analyzed (which doc files).
    - What was synced (counts + a few page titles per DB).
    - What was skipped and why.
    - Any Notion API errors encountered, verbatim.

## Guardrails

- Never delete or archive Notion pages automatically. Only create and update.
- Never auto-create select / status / multi_select options. If a value does not exist in Notion's option list, skip the property and surface it.
- Never send `created_time` or any rollup property in a write payload — Notion rejects them.
- If a Notion API call fails: report the error verbatim, do not fall back silently, and do not write a Progress Log entry claiming success for that item.
- Project Snapshot is rewritten every run; Progress Log is append-only — never rewrite history.
- Do not print the Notion token value in any message.
