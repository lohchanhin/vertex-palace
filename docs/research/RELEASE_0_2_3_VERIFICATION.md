# Vertex Palace 0.2.3 Release Verification

Status: prepublish source, bundle, and clean-tarball gates passed; public npm,
Git tag, and marketplace-install gates are pending.

Date: 2026-07-19

## Release Scope

Version 0.2.3 turns the release-routing failure observed during the 0.2.2
publication into a dedicated, cross-ecosystem task type. The evidence chain is:

1. [Frozen 0.2.2 baseline](./RELEASE_ROUTING_BASELINE_0_2_2.md)
2. [Real-repository candidate result](./RELEASE_ROUTING_RESULT_0_2_3.md)
3. [Preregistered matrix protocol](./RELEASE_ROUTING_MATRIX_PROTOCOL.md)
4. [Cross-ecosystem matrix result](./RELEASE_ROUTING_MATRIX_RESULT_0_2_3.md)

The matrix covers JavaScript workspaces, Codex plugin distribution,
Python/PyPI, Chinese release intent, and six negative controls. Failed and
irrelevant-filler intermediate implementations remain documented.

## Prepublish Gates

| Gate | Result |
| --- | --- |
| Core tests | 51/51 passed |
| CLI tests | 2/2 passed |
| MCP tests | 2/2 passed |
| Shared tests | no test files, passed with `--passWithNoTests` |
| TypeScript lint | passed |
| Monorepo build | passed |
| Generated CLI | reports 0.2.3 |
| Generated MCP | reports 0.2.3, 10 tools, context call passed |
| Manifest consistency | root, four workspaces, plugin, marketplace ref, and MCP pin all match 0.2.3 |

## Clean Candidate Tarball

The npm tarball was installed into a new npm project with no workspace links.
A separate fresh clone of the public repository was initialized and indexed
using only that installed CLI.

| Measure | Result |
| --- | --- |
| Tarball | `vertex-palace-0.2.3.tgz` |
| Packed size | 3,659,550 bytes |
| Unpacked size | 19,300,427 bytes |
| npm entry count | 7 |
| SHA-256 | `3529A3D886BC1196C20B14C4D4CDB01F5D14AFF186B703693D65C53F2F0D02C8` |
| Installed CLI | 0.2.3 |
| Current release task | `release`, confidence 0.65, 11 files |
| Required surfaces | root package, marketplace, plugin manifest, and MCP pin all present |
| Installed MCP | 10 tools; initialize, tools/list, and `palace_context` passed |

## Public Gates Still Required

- Publish `vertex-palace@0.2.3` to npm.
- Confirm npm `latest`, integrity, and registry tarball metadata.
- Install from the public registry in a second clean directory.
- Exercise public CLI, current release route, and MCP stdio server.
- Create and push annotated `v0.2.3` only after public npm verification.
- Clone the public tag and verify plugin manifest, marketplace ref, and MCP pin.

## Claim Boundary

This release improves release-task classification, changed-file coverage,
route focus, and confidence calibration in the measured scenarios. It does not
claim that Vertex Palace universally reduces total agent tokens or wall-clock
time. The independent benchmark repository remains authoritative for those
outcomes.

## 简体中文摘要

0.2.3 的源码、全仓测试、构建、版本一致性、候选 tarball 隔离安装、CLI 与 MCP
都已通过发布前门禁。真实当前发布任务能命中 package、Marketplace、plugin
manifest 与 MCP pin。npm 公开发布、registry clean install、Git tag 和公开 tag
克隆验证仍待执行；在 npm 0.2.3 真正可安装前，不会把 0.2.3 pin 推到 GitHub。
本版本只声明已量测的路由质量改善，不宣称所有任务都会节省总 Token 或时间。
