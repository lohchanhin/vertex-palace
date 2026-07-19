---
name: vertex-palace
description: Use before coding, debugging, refactoring, testing, reviewing, or exploring a repository to route Codex through the repository's Vertex Palace and retrieve only the needed files, rooms, drawers, and symbols.
---

# Vertex Palace Skill

Use this skill before starting repository work.

Aliases users may use for this skill: `记忆宫殿工具`, `记忆宫殿`, `memory palace`, `palace tool`, and `Context Palace`.

## Workflow

1. Call `palace_context` once with the user's exact task and `auto: true`. It initializes or refreshes the palace, plans the route, selects an adaptive mode, and reports the actual delivered payload.
2. Follow the selected mode: direct inspection for `bypass`, Primary-only for `route-lite`, Primary plus Support for `full-palace`, and scoped memory only for `guarded-memory-palace`.
3. Inspect routed files and symbols in tier order.
4. Expand Deferred references only when evidence from code, tests, or runtime output requires it.
5. After implementation and tests, call `palace_evaluate` with the task and files actually changed. Review Token reduction, changed-file coverage, route focus, missed files, and confidence calibration.
6. After finishing, call `palace_write_memory` with changed files, tests run, decisions, failed attempts, and explicit pitfalls. This updates `.palace/07-memory/`, `.palace/memory/`, and `.palace/00-entrance/pitfall-board.md`.

If `palace_context` is unavailable but the CLI is installed, use `palace context "<task>" --auto`. Use the lower-level status, init, index, route, and pack commands only for diagnosis or explicit manual control; do not call all of them before every task.

## Rules

- Do not perform broad repository scans before reading the task context.
- Do not inject the entire entrance pitfall board. Guarded mode only uses relevant, scoped, current entries and current code always outranks memory.
- Do not treat `记忆宫殿工具` or `memory palace` as unknown; map them to Vertex Palace and the `palace_*` tools.
- Do not read unrelated folders unless the route or evidence requires it.
- Prefer symbol-level snippets over full files.
- Prefer room summaries before opening full drawers.
- Do not treat route confidence as proof of relevance. Use `palace_evaluate` after the task when actual changed files are known.
- Do not claim Token or time savings from route size alone. Use the payload metrics and end-to-end evaluation evidence.
- Keep the task route visible in the reasoning summary.
- If the context route confidence is low, inspect the directory map and call `palace_route` again with refined keywords.
- If the MCP tools are not available in the current Codex thread, use the `palace` CLI when it is installed. If neither is available, say Vertex Palace is not loaded in this environment.
- When a task reveals a mistake worth remembering, pass it as `pitfalls` or `--pitfall` during memory write so future packs surface it at the entrance.
