# Vertex Palace 0.2.3 Release Verification

Status: complete. Prepublish, public npm registry, annotated Git tag, public-tag
clone, CLI, and MCP distribution gates passed.

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

## Public npm Verification

The exact candidate tarball passed npm WebAuth publication and registry
propagation. Its prepublish SHA-1 matches the registry `dist.shasum` byte for
byte.

| Measure | Result |
| --- | --- |
| npm package | `vertex-palace@0.2.3` |
| npm `latest` | 0.2.3 |
| Registry SHA-1 | `e1740751948ea857746d6bb0521327120a77284b` |
| Candidate SHA-1 | `e1740751948ea857746d6bb0521327120a77284b`, exact match |
| Registry integrity | `sha512-V8k690m7soE3XIsqSMQnUo4yoC4/jiiv6MXgP7Guff934nRQHo5Jcip4bHRZSaaZz0F5OQmdY8V/22W2mUTCSA==` |
| Registry install | clean npm project, passed |
| Public CLI | installed and `npx`, both 0.2.3 |
| Public current release route | `release`, confidence 0.65, 11 files, required distribution surfaces present |
| Public installed MCP | 10 tools; initialize, tools/list, and context call passed |
| Exact plugin npx MCP command | version 0.2.3, 10 tools, passed |

## Git And Plugin Distribution Verification

| Measure | Result |
| --- | --- |
| Public `main` at tag time | `20b5e6098cc64a7eb1eea87377f758bc22a8ba83` |
| Annotated tag object | `4261ff5e3ed9664b6bf184a71b09f2b6ea41471f` |
| Peeled `v0.2.3` commit | `20b5e6098cc64a7eb1eea87377f758bc22a8ba83` |
| Public tag package version | 0.2.3 |
| Public tag plugin version | 0.2.3 |
| Public tag marketplace ref | `v0.2.3` |
| Public tag MCP npm pin | `vertex-palace@0.2.3` |

The Codex desktop-bundled executable is visible under WindowsApps but returned
`Access is denied` when invoked from PowerShell. Therefore this record does not
claim a direct `codex plugin marketplace add` CLI pass. The public annotated
tag, plugin manifest, marketplace ref, npm pin, registry package, and exact
declared npx MCP runtime were verified independently.

## Claim Boundary

This release improves release-task classification, changed-file coverage,
route focus, and confidence calibration in the measured scenarios. It does not
claim that Vertex Palace universally reduces total agent tokens or wall-clock
time. The independent benchmark repository remains authoritative for those
outcomes.

## 简体中文摘要

0.2.3 的源码、全仓测试、构建、版本一致性、候选 tarball 隔离安装、CLI 与 MCP
都已通过发布前门禁。npm registry 的 latest 已是 0.2.3，候选 tarball SHA-1
与 registry shasum 完全一致；公网 install、npx CLI、真实发布路线、安装包 MCP
和插件原样 npx MCP 命令也全部通过。annotated `v0.2.3` 与公开 tag 克隆的
package、plugin、Marketplace ref 和 MCP pin 也已验证。WindowsApps 权限阻止从
PowerShell 直接执行 Codex 内置 CLI，因此没有虚构 marketplace CLI 成功记录。
本版本只声明已量测的路由质量改善，不宣称所有任务都会节省总 Token 或时间。
