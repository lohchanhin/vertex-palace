# Changelog

## Unreleased

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
