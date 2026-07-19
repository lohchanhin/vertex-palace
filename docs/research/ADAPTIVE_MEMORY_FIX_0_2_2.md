# Adaptive Full-Palace Memory Fidelity Fix

Status: implemented and release-gated for Vertex Palace 0.2.2.

## Evidence That Triggered The Fix

The frozen public [Adaptive v2.2 benchmark](https://github.com/lohchanhin/benchmarks-ab-demo/blob/main/docs/research/ADAPTIVE_V2_2_FINAL.md)
ran Vertex Palace 0.2.1. In all four useful-memory trials:

- Full Palace received both seeded Aurora pitfall records.
- Adaptive selected `full-palace` but reported zero memory items and zero
  guardrails.
- Adaptive omitted both records in warm and cold indexes and every order
  position.

The benchmark retained those outcomes as valid v0.2.1 behavior. It did not
change the treatment after the finding.

## Root Cause

The omission was deterministic:

1. `mode-selector.ts` listed `memory` as a disabled section for
   `full-palace` and assigned its memory level as `none`.
2. `context-packer.ts` called `readGuardedMemory` only when the selected mode
   was exactly `guarded-memory-palace`.
3. The Full Palace Adaptive branch therefore could not deliver relevant
   memory even when preparation had seeded it successfully.

## Product Change

Version 0.2.2 makes Adaptive Full Palace use the `scoped-summary` memory level.
The packer retrieves only relevant, age-bounded, token-bounded entries and:

- exposes them in JSON `memory`;
- renders them under `## Relevant Memory` in Markdown;
- adds the current-code-and-tests-first guardrail;
- includes their cost in the final serialized payload metrics and budget.

Guarded Memory remains the explicit risk mode for prior decisions, stale
behavior, and tenant-isolation tasks. Full Palace now preserves relevant
memory instead of silently dropping it.

## Regression Contract

The Core test uses the exact Aurora task text from the benchmark, a repository
large enough to select `full-palace`, and the same two classes of seeded
pitfall. It asserts:

- automatic mode remains `full-palace`;
- memory level is `scoped-summary`;
- two entries are delivered in Markdown and JSON;
- the current-code-first guardrail is present;
- measured JSON bytes match the final serialized body;
- the selected context budget is not exceeded.

## Release Verification

| Gate | Result |
| --- | --- |
| Core tests | 45/45 passed |
| CLI tests | 2/2 passed |
| MCP tests | 2/2 passed |
| TypeScript lint | passed |
| Monorepo build | passed |
| Repository MCP smoke | 10 tools, version 0.2.2, passed |
| npm pack | 7 files, package id `vertex-palace@0.2.2` |
| Clean tarball install | CLI version 0.2.2, passed |
| Clean Aurora fixture | 105 generated files, `full-palace`, 2 memory items, 1 guardrail |
| Clean JSON transport | 3,622 delivered bytes, measured bytes matched |
| Clean installed MCP | 10 tools, passed |
| npm registry | `latest=0.2.2`, SHA-1 `5eb6f0be59399c94311408b209b461a3aeea3fee` |
| Clean registry install | CLI version 0.2.2, passed |
| Registry Aurora fixture | 105 noise files, `full-palace`, 2 memory items, 2 guardrails |
| Registry JSON transport | 4,190 delivered bytes, measured bytes matched |
| Registry installed MCP | 10 tools, passed |

The first clean-install harness attempt had broken nested shell quoting and did
not stop after `node -e` failed. Its later checks were discarded. A second
attempt proved the new nonzero-exit gate worked but hit the same quoting issue.
The accepted third attempt used direct temporary fixture generation, checked
every external exit code, verified all 105 files existed, and then passed the
complete CLI, context, payload, and installed-MCP gates.

After publication, one combined public-install command was rejected by the
local command-safety layer before any test step ran. The next command created
the intended child directory but accidentally ran npm from its parent temp
directory; its CLI result was discarded as non-isolated. The accepted registry
run set the working directory explicitly, installed only
`vertex-palace@0.2.2`, regenerated and counted the fixture, asserted the
delivered memory and exact JSON bytes, and ran the installed MCP server.

## Research Boundary

This repair does not retroactively improve the frozen v2.2 benchmark. Any
claim about 0.2.2 efficiency or correctness requires a fresh plan, fresh trial
ids, fresh seeds, and a new preregistered protocol. The existing study supports
the bug discovery and repair rationale, not a post-fix performance claim.

## 简体中文摘要

公开 v2.2 基准在 v0.2.1 的四组 useful-memory trial 中，都复现了 Adaptive
选择 `full-palace` 却把两条已播种记忆漏掉的问题。根因是 selector 明确关闭
Full Palace 的 memory，而 packer 也只为 guarded 模式读取记忆。0.2.2 让
Full Palace 使用 `scoped-summary`，并在 Markdown 与 JSON 中实际交付相关记忆、
防护语与正确的 payload 计量。修复已通过源码测试、构建、npm tarball 全新安装、
105 文件 Aurora 夹具与安装包 MCP smoke。冻结的 v0.2.1 研究结果不会改写；
0.2.2 的效果必须用新协议重新验证。
