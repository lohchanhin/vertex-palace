---
name: vertex-palace
description: Use before coding, debugging, refactoring, testing, reviewing, or exploring a repository to route Codex through the repository's Vertex Palace and retrieve only the needed files, rooms, drawers, and symbols.
---

# Vertex Palace Skill

Use this skill before starting repository work.

Aliases users may use for this skill: `记忆宫殿工具`, `记忆宫殿`, `memory palace`, `palace tool`, and `Context Palace`.

## Workflow

1. Call `palace_context` once with the user's exact task. It automatically initializes the palace, refreshes a missing or stale index, plans the route, and returns a compact context pack.
2. Read the entrance pitfall board included in the context pack before editing.
3. Inspect routed files and symbols first.
4. Expand beyond the route only when evidence from code, tests, or runtime output requires it.
5. After implementation and tests, call `palace_evaluate` with the task and files actually changed. Review Token reduction, changed-file coverage, route focus, missed files, and confidence calibration.
6. After finishing, call `palace_write_memory` with changed files, tests run, decisions, failed attempts, and explicit pitfalls. This updates `.palace/07-memory/`, `.palace/memory/`, and `.palace/00-entrance/pitfall-board.md`.

If `palace_context` is unavailable but the CLI is installed, use `palace context "<task>"`. Use the lower-level status, init, index, route, and pack commands only for diagnosis or explicit manual control; do not call all of them before every task.

## Rules

- Do not perform broad repository scans before reading the task context.
- Do not skip the entrance pitfall board when it exists; its job is to prevent repeated mistakes.
- Do not treat `记忆宫殿工具` or `memory palace` as unknown; map them to Vertex Palace and the `palace_*` tools.
- Do not read unrelated folders unless the route or evidence requires it.
- Prefer symbol-level snippets over full files.
- Prefer room summaries before opening full drawers.
- Do not treat route confidence as proof of relevance. Use `palace_evaluate` after the task when actual changed files are known.
- Keep the task route visible in the reasoning summary.
- If the context route confidence is low, inspect the directory map and call `palace_route` again with refined keywords.
- If the MCP tools are not available in the current Codex thread, use the `palace` CLI when it is installed. If neither is available, say Vertex Palace is not loaded in this environment.
- When a task reveals a mistake worth remembering, pass it as `pitfalls` or `--pitfall` during memory write so future packs surface it at the entrance.
