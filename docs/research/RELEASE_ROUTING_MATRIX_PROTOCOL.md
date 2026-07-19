# Release Routing Cross-Ecosystem Matrix Protocol

Status: frozen before implementing matrix-driven changes.

Candidate snapshot: `a1b6016` on the Vertex Palace main branch.

## Purpose

The first release-routing result corrected one real Vertex Palace task, but
that task contains unusually strong local terms such as Adaptive, Full Palace,
plugin, MCP, and npm. This matrix tests whether the new task type and surface
selection generalize without turning every mention of publishing into an
actual release action.

## Positive Scenarios

### R1: Vertex Palace Replication Control

Repeat the already frozen 19-file task. This is a replication control, not a
new preregistered discovery. It must retain at least 50% changed-file coverage,
0.60 route focus, explicit `.mcp.json` coverage, and non-overconfident
calibration.

### R2: JavaScript Monorepo npm Release

Task:

> Publish version 1.4.0 of the api and web workspace packages to npm, update
> the changelog, and verify the release regression test.

Frozen changed files:

- `package.json`
- `packages/api/package.json`
- `packages/web/package.json`
- `packages/api/src/index.ts`
- `packages/api/test/release.test.ts`
- `CHANGELOG.md`

With an eight-step route, require `release` classification, all three package
manifests, the changelog, one release test, at least 4/6 coverage, at least
0.50 focus, and no unrelated payment implementation.

### R3: Codex Plugin Distribution

Task:

> Release the Acme Codex plugin v1.2.0, update its marketplace ref and MCP npm
> pin, then verify public installation.

Frozen changed files:

- `package.json`
- `.agents/plugins/marketplace.json`
- `plugins/acme/.codex-plugin/plugin.json`
- `plugins/acme/.mcp.json`
- `packages/mcp/src/server.ts`
- `CHANGELOG.md`

With an eight-step route, require `release` classification, all three plugin
metadata files, the root package manifest, at least 4/6 coverage, and at least
0.50 focus.

### R4: Python/PyPI Release

Task:

> Publish Acme Python 2.0.0 to PyPI, update the changelog, and verify the
> release test before tagging.

Frozen changed files:

- `pyproject.toml`
- `src/acme/__init__.py`
- `tests/test_release.py`
- `CHANGELOG.md`

With a six-step route, require `release` classification, `pyproject.toml`, the
changelog, the release test, at least 3/4 coverage, and at least 0.50 focus.
This scenario prevents a JavaScript-only definition of package metadata.

### R5: Chinese Release Intent

`发布 Acme 新版本到 npm，更新 changelog 与 Git tag` must classify as
`release` and retain package plus release-record surfaces.

## Negative Controls

| Task | Required classification |
| --- | --- |
| `Fix npm publish authentication failure E401` | `bugfix` |
| `修复 npm 发布失败 E401` | `bugfix` |
| `Explain how to publish a package to npm` | `explain` |
| `Review the release checklist for security risks` | `review` |
| `Test the release workflow without publishing` | `test` |
| `Deploy the application to production` | retain existing `unknown` |

## Global Gates

- Existing evaluation, bugfix, refactor, full-stack, scanner, packer, memory,
  CLI, and MCP route tests must remain green.
- Core, CLI, MCP, lint, build, and MCP smoke must remain green.
- A synthetic pass cannot override a failure on the R1 real repository
  replication.
- Thresholds will not be lowered after observing results. A failed case is
  fixed or reported as failed.
- No token or wall-time efficiency claim will be made from this matrix; it
  measures task intent, changed-file coverage, route focus, and calibration.

## 简体中文摘要

这个矩阵在发布 0.2.3 前检查是否过拟合 Vertex Palace 自己的发布任务。正向
情境包含 JavaScript monorepo、Codex plugin、Python/PyPI 与中文发布意图；
反例包含发布失败、使用说明、审核、测试流程和普通应用部署。所有任务、变更
文件、route limit 与通过门槛都在观察结果前冻结，失败后不会降低标准。
