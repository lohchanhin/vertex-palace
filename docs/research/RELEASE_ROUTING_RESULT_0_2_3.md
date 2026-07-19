# Release Routing Candidate Result for Vertex Palace 0.2.3

Status: implementation and repository regression gates passed; npm release not
yet published.

This result follows the frozen
[0.2.2 baseline](./RELEASE_ROUTING_BASELINE_0_2_2.md). The task, 19 changed
files, route limit, and acceptance thresholds were retained.

## Final Before/After Result

| Measure | 0.2.2 baseline | 0.2.3 candidate |
| --- | ---: | ---: |
| Task type | `unknown` | `release` |
| Matched changed files | 3/19 | 12/19 |
| Changed-file coverage | 0.16 | 0.63 |
| Route focus | 0.25 | 1.00 |
| Route confidence | 0.68 | 0.65 |
| Calibration error | 0.52 | 0.02 |
| Calibration status | overconfident | well-calibrated |

The final 12-step route contained only files from the frozen changed-file set:

1. `packages/core/test/mode-selector.test.ts`
2. `docs/research/ADAPTIVE_MEMORY_FIX_0_2_2.md`
3. `packages/core/src/packer/context-packer.ts`
4. `package.json`
5. `packages/mcp/package.json`
6. `packages/core/src/router/mode-selector.ts`
7. `plugins/vertex-palace/.codex-plugin/plugin.json`
8. `.agents/plugins/marketplace.json`
9. `plugins/vertex-palace/.mcp.json`
10. `packages/cli/package.json`
11. `packages/core/package.json`
12. `packages/shared/package.json`

## Rejected Intermediate Results

The first implementation passed its synthetic fixture, but the same code on
the real repository reached only 7/19 coverage (0.37), 0.58 focus, and a 0.28
overconfidence error. High-scoring duplicate tests and import-neighbor
expansion displaced release metadata. That result was rejected.

A surface-quota revision reached 11/19 coverage (0.58), 0.92 focus, and a 0.07
well-calibrated error. It still omitted `plugins/vertex-palace/.mcp.json`
because the plugin quota selected only the plugin manifest and marketplace
metadata. The test had incorrectly allowed marketplace metadata as an
alternative to the MCP pin. The assertion was tightened and this result was
also rejected.

The accepted revision reserves release-route capacity for two implementation
files, one regression test, up to five package manifests, three plugin
metadata files, and one release record. Unavailable categories do not consume
capacity; remaining positions still use normal scoring.

## Classification Controls

- The frozen English task is `release`.
- A Chinese npm and Git tag publication task is `release`.
- `Fix npm publish authentication failure E401` remains `bugfix`.
- The equivalent Chinese npm failure task remains `bugfix`.
- Generic application deployment retains its previous `unknown`
  classification.

## Repository Gates

| Gate | Result |
| --- | --- |
| Focused router suite | 15/15 passed |
| Core suite | 47/47 passed |
| CLI suite | 2/2 passed |
| MCP suite | 2/2 passed |
| Shared suite | no test files, passed with `--passWithNoTests` |
| TypeScript lint | passed |
| Monorepo build | passed |
| Repository MCP smoke | version 0.2.2 development bundle, 10 tools, passed |

When the new cross-package `TaskType` was first checked, Core TypeScript read
the previously built Shared declaration and rejected `release`. Rebuilding the
Shared package before the Core check resolved it; the subsequent full build
and root lint passed. This was a build-order artifact, not a product test pass.

## Research Boundary

This is one frozen, real release task plus regression fixtures and negative
controls. It demonstrates correction of the observed release-routing failure;
it does not establish general token or time savings. Broader release scenarios
and a clean packaged install are still required before publishing 0.2.3.

The ignored generated MCP bundle remains in the 19-file denominator but cannot
be routed from the index by design. Despite that conservative denominator, the
candidate exceeded every preregistered threshold.

## 简体中文摘要

同一个真实发布任务在 0.2.2 只有 3/19 覆盖、25% focus，且置信度明显过高。
候选实现经过两次拒绝后，最终达到 12/19 覆盖、100% focus，校准误差从 0.52
降到 0.02，并且关键实现、回归测试、所有 package manifest、plugin manifest、
marketplace 与 `.mcp.json` 都进入路线。完整源码测试、构建、lint 和 MCP smoke
已通过；这仍是单一发布情境证据，不能扩大解释成普遍 Token 或时间收益。
