---
name: vertex-palace
description: Use before coding, debugging, refactoring, testing, reviewing, or exploring a repository to route Codex through the repository's Vertex Palace and retrieve only the needed files, rooms, drawers, and symbols.
---

# Vertex Palace Skill

Use this skill before starting repository work.

Aliases users may use for this skill: `记忆宫殿工具`, `记忆宫殿`, `memory palace`, `palace tool`, and `Context Palace`.

## Workflow

1. Call `palace_status`.
2. If the project is not initialized, call `palace_init`.
3. If the project is not indexed or the index is stale, call `palace_index`.
4. Call `palace_route` with the user's task.
5. Review the returned floors, rooms, drawers, reasons, excluded areas, and confidence. The latest route is also written to `.palace/routes/latest-route.*` and `.palace/routes/optimized-route.txt`.
6. Call `palace_pack` to get the minimal context package.
7. Inspect files suggested by the palace route first.
8. Expand beyond the route only when evidence from code, tests, or runtime output requires it.
9. After finishing, call `palace_write_memory` with changed files, tests run, decisions, and failed attempts. This updates both `.palace/07-memory/` and the readable `.palace/memory/` ledger.

## Rules

- Do not perform broad repository scans before checking the palace route.
- Do not treat `记忆宫殿工具` or `memory palace` as unknown; map them to Vertex Palace and the `palace_*` tools.
- Do not read unrelated folders unless the route or evidence requires it.
- Prefer symbol-level snippets over full files.
- Prefer room summaries before opening full drawers.
- Keep the task route visible in the reasoning summary.
- If `palace_route` confidence is low, inspect the directory map and call `palace_route` again with refined keywords.
- If the MCP tools are not available in the current Codex thread, use the `palace` CLI when it is installed. If neither is available, say Vertex Palace is not loaded in this environment.
