# Release Routing Baseline on Vertex Palace 0.2.2

Status: frozen before implementation of the next routing change.

## Snapshot

- Product version: Vertex Palace 0.2.2
- Repository commit: `4fc612954d3d1e6b9bd07f5d12969148fea117a3`
- Comparison range: peeled `v0.2.1` through the snapshot commit
- Actual changed files: 19
- Route limit: 12

The evaluated task was:

> Release Vertex Palace 0.2.2 after fixing Adaptive Full Palace memory
> delivery, verify npm registry, Git tag, and public plugin MCP installation

## Frozen Result

| Measure | Result |
| --- | ---: |
| Task type | `unknown` |
| Route confidence | 0.68 |
| Changed-file coverage | 0.16 (3/19) |
| Route focus | 0.25 (3/12) |
| Calibration error | 0.52, overconfident |
| Estimated repository tokens | 75,914 |
| Estimated pack tokens | 3,419 |
| Estimated token reduction | 95.5% |

The route matched the remediation report, MCP server, and MCP package
manifest. It missed both files that implemented the behavior change
(`context-packer.ts` and `mode-selector.ts`), their regression tests, the root
and workspace version manifests, the marketplace metadata, plugin manifest,
npm pin, README, changelog, and generated plugin bundle.

The 95.5% estimated token reduction is therefore not a success result. A small
pack that omits critical changed surfaces is simply incomplete.

## Failure Hypothesis

1. The task classifier has no release or distribution task type, so a mixed
   release, fix, npm, Git tag, and plugin task falls through to `unknown`.
2. Task analysis recognizes MCP but does not model the release surface as a
   connected set of manifests, changelog, package entrypoints, generated
   artifacts, tests, and the implementation named by the task.
3. The confidence score is based mainly on the strength of selected matches;
   it does not sufficiently penalize a release route that lacks expected
   release surfaces.

## Preregistered Acceptance Conditions

The next implementation is accepted only if all of these hold:

- the frozen task is no longer classified as `unknown`;
- a 12-step route covers at least 50% of the 19 frozen changed files;
- the route includes both implementation files, at least one corresponding
  core regression test, the root package manifest, plugin MCP metadata, and a
  release record such as the changelog or research report;
- route focus is at least 0.60;
- confidence is not reported as overconfident against the frozen changed-file
  set;
- ordinary application deployment, bugfix, evaluation, and refactor fixtures
  retain their existing classifications and critical routes;
- Core, CLI, MCP, lint, build, repository MCP smoke, package tarball, and a
  clean install remain green.

No frozen v2.2 benchmark result will be changed. This is a new product-routing
experiment, not a reinterpretation of the Adaptive benchmark.

## 简体中文摘要

Vertex Palace 0.2.2 在真实发布任务上只覆盖 19 个变更文件中的 3 个，任务类型
仍是 `unknown`，覆盖率 16%，但置信度为 0.68，属于明显过度自信。虽然估算的
Token 缩减达到 95.5%，但关键实现、测试、版本清单和插件配置都被漏掉，因此
不能算成功。下一阶段会先增加发布任务语义，再验证关键文件覆盖、负向对照和
完整测试；冻结的 Adaptive v2.2 结果不会被改写。
