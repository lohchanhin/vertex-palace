# Changelog

## Unreleased

## 0.1.6 - 2026-07-19

### Added

- `palace context` / `palace task` as the single task-entry command that initializes, refreshes, routes, and packs context when needed.
- `palace_context` MCP tool with route and drawer limits for compact agent context.
- End-to-end tests for one-call context setup on a previously uninitialized repository.

### Changed

- Codex plugin, hook, generated guidance, and README now prefer one context call instead of separate status, init, index, route, and pack calls.
- Context packs produced through the task entry point omit excluded-area narration by default.
- MCP smoke coverage now requires the new one-call tool.

### Fixed

- Reduced repeated agent tool calls and retry opportunities exposed by the A/B benchmark.
- Prevented routine task startup from spending context on redundant Palace lifecycle output.

## 0.1.5 - 2026-07-18

### Added

- `palace evaluate` / `palace eval` command for context-efficiency and route-quality measurement.
- `palace_evaluate` MCP tool.
- Persisted Markdown and JSON evaluation reports under `.palace/evaluations/`.
- Changed-file coverage, route focus, and route-confidence calibration.
- Build Week development and judging documentation.
- Windows, macOS, and Linux CI matrix.
- MCP stdio smoke test using Content-Length framed JSON-RPC messages.

### Changed

- Evaluation tasks now route toward the dedicated evaluation subsystem.
- Scanner and router avoid nested repositories, stale rooms, duplicate source entries, and unrelated fixtures more aggressively.

## 0.1.4

- Published the CLI and MCP server through the `vertex-palace` npm package.
- Added the unique `vertex-palace-mcp-stdio` executable to avoid stale local shim collisions.
