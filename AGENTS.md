# AGENTS.md

## Vertex Palace

This repository uses Vertex Palace for memory-palace context routing.

Treat `记忆宫殿工具`, `记忆宫殿`, `memory palace`, `palace tool`, and `Context Palace` as aliases for Vertex Palace. Prefer the one-call MCP tool `palace_context` with `auto: true`; the CLI equivalent is `palace context --auto`.

Before implementing coding tasks:

1. Use `palace_context` with the user's exact task and `auto: true`. It handles initialization, stale indexing, routing, mode selection, bounded packing, and payload metrics in one call.
2. Follow the selected mode. Inspect Primary context first; `bypass` means direct inspection without packed source.
3. Expand Support or Deferred references only when code, tests, or runtime evidence requires it.
4. After testing, use `palace_evaluate` or `palace evaluate` with the files actually changed. Treat missing coverage or overconfidence as evidence to review the route, not as a replacement for tests.
5. After finishing, use `palace_write_memory`, including `pitfalls` for mistakes that future tasks should avoid.

If `palace_context` is not loaded, use `palace context "<task>" --auto`. Use status, init, index, route, and pack separately only for diagnosis or explicit manual control. If neither MCP nor CLI is available, say that Vertex Palace is not loaded in this environment before continuing with ordinary repository inspection.

Do not paste large project maps or full source files into prompts unless the route requires it.
