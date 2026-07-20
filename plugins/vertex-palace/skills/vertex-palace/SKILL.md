---
name: vertex-palace
description: Use before coding, debugging, refactoring, testing, reviewing, or exploring a repository to route Codex through the repository's Vertex Palace and retrieve only the needed files, rooms, drawers, and symbols.
---

# Vertex Palace Skill

Use this skill before starting repository work.

Aliases users may use for this skill: `记忆宫殿工具`, `记忆宫殿`, `memory palace`, `palace tool`, and `Context Palace`.

## Workflow

1. Call `palace_context` once with the user's exact task and `auto: true`. It initializes or refreshes the palace, plans the route, selects an adaptive mode, and reports the actual delivered payload.
2. Review `memoryTelemetry` whenever memory is enabled. Confirm the candidate and included IDs, and inspect every exclusion reason instead of assuming a missing memory was irrelevant.
3. Follow the selected mode: direct inspection for `bypass`, Primary-only for `route-lite`, Primary plus Support for `full-palace`, and scoped memory only for `guarded-memory-palace`.
4. For `bypass`, open the Primary candidate once, make the focused change, use the already-known or conventional verification command, combine final status and diff checks, and stop. Do not open package metadata solely to rediscover a standard test command.
5. Inspect Primary first, then the named Required Evidence. Treat Support as bounded backup context. A `full_file` or `full_symbol` drawer is already delivered source: do not reopen that path. Batch-read only Required Evidence that was not delivered in full.
6. Obey `Do Not` and `Stop Condition`. Expand Deferred references only when Primary, Required Evidence, tests, or runtime output conflicts; do not inspect Excluded paths without new evidence.
7. Resolve every item in `Conflict Summary` before changing scope.
8. Run targeted and broader verification in one shell invocation when both are required. Combine final status and diff checks instead of spending separate calls on each.
9. After implementation and tests, call `palace_evaluate` with the task and files actually changed. Review Token reduction, changed-file coverage, route focus, missed files, and confidence calibration.
10. After finishing, call `palace_write_memory` with changed files, tests run, decisions, failed attempts, and explicit pitfalls. This updates `.palace/07-memory/`, `.palace/memory/`, and `.palace/00-entrance/pitfall-board.md`.

If `palace_context` is unavailable but the CLI is installed, use `palace context "<task>" --auto`. Use the lower-level status, init, index, route, and pack commands only for diagnosis or explicit manual control; do not call all of them before every task.

## Rules

- Do not perform broad repository scans before reading the task context.
- Do not inject the entire entrance pitfall board. Guarded mode only uses relevant, scoped, current entries and current code always outranks memory.
- Do not silently accept `memoryIncluded: 0` when the task should have relevant project history. Check candidate IDs and machine-readable exclusion reasons, then refine scope or investigate the memory index.
- Do not treat `记忆宫殿工具` or `memory palace` as unknown; map them to Vertex Palace and the `palace_*` tools.
- Do not read unrelated folders unless the route or evidence requires it.
- Do not reopen source delivered in a `full_file` or `full_symbol` drawer.
- Do not split package-command discovery, status, diff-check, and diff into separate calls when the route already provides enough evidence to batch them.
- Prefer symbol-level snippets over full files.
- Prefer room summaries before opening full drawers.
- Do not treat route confidence as proof of relevance. Use `palace_evaluate` after the task when actual changed files are known.
- Do not claim Token or time savings from route size alone. Use the payload metrics and end-to-end evaluation evidence.
- Keep the task route visible in the reasoning summary.
- If the context route confidence is low, inspect the directory map and call `palace_route` again with refined keywords.
- If the MCP tools are not available in the current Codex thread, use the `palace` CLI when it is installed. If neither is available, say Vertex Palace is not loaded in this environment.
- When a task reveals a mistake worth remembering, pass it as `pitfalls` or `--pitfall` during memory write so future packs surface it at the entrance.
