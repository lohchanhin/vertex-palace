# AGENTS.md

## Vertex Palace

This repository uses Vertex Palace for memory-palace context routing.

Treat `记忆宫殿工具`, `记忆宫殿`, `memory palace`, `palace tool`, and `Context Palace` as aliases for Vertex Palace. The MCP tools are named `palace_status`, `palace_init`, `palace_index`, `palace_route`, `palace_pack`, and `palace_write_memory`; the CLI command is `palace`.

Before implementing coding tasks:

1. Use `palace_status`.
2. Read the entrance pitfall board at `.palace/00-entrance/pitfall-board.md` when it exists.
3. If needed, use `palace_init` and `palace_index`.
4. Use `palace_route` with the user's task.
5. Use `palace_pack` to retrieve the minimal context package.
6. Inspect route files before broad repository search.
7. Expand beyond the route only when code, tests, or runtime evidence requires it.
8. After finishing, use `palace_write_memory`, including `pitfalls` for mistakes that future tasks should avoid.

If the MCP tools are not loaded, use the `palace` CLI. If neither MCP nor CLI is available, say that Vertex Palace is not loaded in this environment before continuing with ordinary repository inspection.

Do not paste large project maps or full source files into prompts unless the route requires it.
