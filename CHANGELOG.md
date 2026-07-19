# Changelog

## Unreleased

## 0.2.2 - 2026-07-19

### Fixed

- Preserve relevant, scoped memory when Adaptive mode selects `full-palace` instead of silently disabling the memory section.
- Render Full Palace memory and its current-code-first guardrail in both Markdown and JSON while keeping the final serialized payload inside the selected budget.

### Added

- Regression coverage using the exact Aurora useful-memory task from the public 16-trial Adaptive v2.2 benchmark.
- Memory-fidelity assertions for mode selection, delivered Markdown, delivered JSON, item counts, guardrails, and measured payload bytes.

### Research

- The public [Adaptive v2.2 benchmark](https://github.com/lohchanhin/benchmarks-ab-demo/blob/main/docs/research/ADAPTIVE_V2_2_FINAL.md) found the v0.2.1 omission in all four useful-memory trials. The frozen results remain unchanged; this release fixes the product behavior separately.

## 0.2.1 - 2026-07-19

### Fixed

- Treat preservation-only wording such as "keep the public API stable" as a guardrail instead of evidence that the task changes a public contract.
- Allow small, focused repositories with route confidence from 0.45 upward to use Route Lite instead of escalating mechanically to Full Palace.
- Refresh the Codex marketplace metadata, plugin MCP pin, CLI version, and MCP server version together.

## 0.2.0 - 2026-07-19

### Added

- Adaptive `palace context --auto` mode selection across `bypass`, `route-lite`, `full-palace`, and `guarded-memory-palace`.
- Primary, Support, and Deferred route tiers with per-step confidence and evidence.
- Measured payload metrics for actual context bytes, estimated tokens, route tiers, memory items, and guardrails.
- One canonical context serializer shared by Core, CLI, and MCP, so payload metrics describe the final delivered Markdown or formatted JSON body without a duplicate MCP wrapper.
- Guarded memory retrieval with relevance, scope, age, confidence, risk, contradiction checks, and a 600-token ceiling.
- CLI `--mode` override and equivalent `auto` / `mode` inputs on the `palace_context` MCP tool for repeatable evaluation.

### Changed

- Adaptive route-lite packs load file summaries instead of accidentally expanding file-level snippets into full files.
- Memory is disabled in Adaptive modes unless task risk explicitly selects guarded memory.
- Documentation and plugin guidance now describe efficiency as a measured outcome, not a guaranteed consequence of fewer routed paths.

### Fixed

- Prevented file nodes without line ranges from injecting entire source files into Adaptive route-lite contexts.
- Prevented unrelated recent pitfall entries from being used as fallback memory in guarded packs.

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
