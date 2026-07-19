# Release Routing Cross-Ecosystem Matrix Result

Status: source candidate and generated MCP bundle passed repository gates;
packaged-install and public npm release gates are still pending.

Protocol: [RELEASE_ROUTING_MATRIX_PROTOCOL.md](./RELEASE_ROUTING_MATRIX_PROTOCOL.md)

The protocol and thresholds were committed at `bc129b0` before this matrix was
run. R1 reuses the previously frozen real Vertex Palace release task. R2-R5
exercise JavaScript workspaces, Codex plugin distribution, Python/PyPI, and
Chinese release intent. Negative controls check that release vocabulary does
not override the requested action.

## Final Results

| Scenario | Classification | Changed-file coverage | Route focus | Confidence | Calibration |
| --- | --- | ---: | ---: | ---: | --- |
| R1 Vertex Palace replication | `release` | 12/19 (0.63) | 1.00 | 0.65 | well-calibrated, error 0.02 |
| R2 JavaScript monorepo/npm | `release` | 5/6 (0.83) | 1.00 | 0.65 | underconfident, error 0.18 |
| R3 Codex plugin distribution | `release` | 6/6 (1.00) | 1.00 | 0.59 | underconfident, error 0.41 |
| R4 Python/PyPI | `release` | 3/4 (0.75) | 1.00 | 0.65 | well-calibrated, error 0.10 |
| R5 Chinese npm release | `release` | required package and changelog surfaces present | 1.00 | capped | not scored against a changed-file set |

Every preregistered threshold passed without being lowered. Route limits were
treated as maxima rather than targets, so unavailable categories did not cause
unrelated files to be added merely to fill a route.

## Final Routes

R1 retained the real 12-file route recorded in
[RELEASE_ROUTING_RESULT_0_2_3.md](./RELEASE_ROUTING_RESULT_0_2_3.md), including
the two implementation files, a regression test, all package manifests, plugin
manifest, marketplace metadata, `.mcp.json`, and a release record.

R2 selected only five relevant files:

1. `packages/api/test/release.test.ts`
2. `packages/api/package.json`
3. `packages/web/package.json`
4. `package.json`
5. `CHANGELOG.md`

R3 selected all six changed files and no unrelated fixture source:

1. `plugins/acme/.codex-plugin/plugin.json`
2. `plugins/acme/.mcp.json`
3. `package.json`
4. `.agents/plugins/marketplace.json`
5. `CHANGELOG.md`
6. `packages/mcp/src/server.ts`

R4 selected only the three preregistered release surfaces:

1. `tests/test_release.py`
2. `pyproject.toml`
3. `CHANGELOG.md`

The unselected R2 and R4 files were implementation version constants. The
protocol required package metadata, release tests, and notes first; their
omission is reflected in the conservative coverage denominator rather than
hidden.

## Negative Controls

| Task intent | Result |
| --- | --- |
| English npm publication failure | `bugfix` |
| Chinese npm publication failure | `bugfix` |
| Explain package publication | `explain` |
| Review a release checklist | `review` |
| Test a release workflow without publishing | `test` |
| Deploy an application | retained `unknown` |

## Rejected Intermediate Results

The first matrix run exposed three failures:

- R3 exceeded its explicit eight-step limit because the release planner treated
  the limit as a target that it could enlarge.
- R4 did not recognize `pyproject.toml` as package metadata.
- `Explain how to publish a package to npm` was incorrectly classified as an
  actual release.

After fixing those failures, every assertion passed, but the routes still used
irrelevant fixture files to fill remaining positions. R2 had 0.63 focus, R3
had 0.75 focus, and R4 had 0.50 focus. This intermediate was rejected even
though it met the frozen minimums.

The accepted revision applies ecosystem-aware manifest selection, requires a
release-related path for the reserved regression-test position, and leaves
unused route capacity empty. Final focus is 1.00 for R1-R4.

## Reproduction

From the repository root on PowerShell:

```powershell
$env:RELEASE_MATRIX_REPORT = "1"
pnpm --filter @vertex-palace/core exec vitest run test/release-routing.test.ts --reporter=verbose

$env:RELEASE_ROUTING_REPORT = "1"
pnpm --filter @vertex-palace/core exec vitest run test/router.test.ts --reporter=verbose
```

The first command emits structured R2-R4 metrics and verifies R5 plus all
negative controls. The second emits the R1 replication result. The reporters
are opt-in so routine test output remains concise.

## Repository Gates

| Gate | Result |
| --- | --- |
| Core | 51/51 passed |
| CLI | 2/2 passed |
| MCP | 2/2 passed |
| Shared | no test files, passed with `--passWithNoTests` |
| TypeScript lint | passed |
| Monorepo and distributable bundle build | passed |
| Generated MCP bundle smoke | version 0.2.2 development bundle, 10 tools, passed |

These checks were run serially because an earlier parallel monorepo run had
produced an esbuild-service infrastructure failure. The clean serial run is
the release gate; the earlier infrastructure event remains documented rather
than silently discarded.

## Research Boundary

This matrix evaluates task classification, changed-file coverage, route focus,
route-limit behavior, and confidence calibration. It does not measure or claim
token, wall-time, correctness, or developer-productivity improvement. Those
claims remain governed by the independent benchmark repository and its frozen
study protocols.

## 简体中文摘要

跨生态矩阵在不降低预注册门槛的情况下全部通过。真实 Vertex Palace 发布任务
维持 12/19 覆盖、100% focus 与 0.02 校准误差；JavaScript monorepo、Codex
plugin、Python/PyPI 和中文发布意图都能正确进入发布路线。英文与中文发布失败、
说明、审核和测试任务不会被误判成真正发布。第一次“断言通过但仍填入无关文件”
的实现也被拒绝，最终 R1-R4 的 route focus 都是 1.00。本矩阵不用于宣称 Token
或时间节省。
