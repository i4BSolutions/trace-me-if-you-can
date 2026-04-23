---
description: Change the active Notion user ID in the trace profile. Leaves database IDs and token alone.
---

# /trace-profile-change

Swap the user ID in the profile without touching anything else.

## Steps

1. If `trace.md` does not exist: tell the user to run `/trace-profile` and stop.
2. Read `trace.md` and show the current `Notion User ID:` value.
3. Ask the user for the new Notion user ID (free-form chat reply — the user provides it directly; do not attempt to fetch from Notion).
4. Validate shape: must look like a UUID (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) or a 32-char hex. If it does not, show the user what you received and ask them to repaste.
5. Use Edit to replace **only** the `- Notion User ID:` line in the Profile section. Do not touch DB IDs, schemas, or the Progress Log.
6. Append a new Progress Log entry dated with today's `currentDate`: `Profile user ID changed from <old-short> to <new-short>.`
7. Confirm: "User ID updated. Run `/trace` next time to tag new Notion pages with this user."

## Guardrails

- Never change Backlog DB ID, AC DB ID, token, or any schema in this command — those are out of scope. If the user wants to change a DB, they must run `/trace-profile` to re-initialize.
- Never print the Notion token.
- Only edit the single line; do not reflow or reformat the Profile section.
