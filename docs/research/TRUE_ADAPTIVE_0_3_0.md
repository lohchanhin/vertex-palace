# True Adaptive Bypass 0.3.0

Status: implemented and locally release-candidate verified. npm publication is intentionally held.

## Evidence That Triggered The Change

The public Adaptive v2.2 benchmark showed that Adaptive could preload less
Palace context than Full Palace while still using more agent calls than
Control. For small, local tasks, Route Lite remained avoidable work. A smaller
context pack alone did not prevent Codex from spending the difference on later
inspection.

Version 0.3.0 therefore changes the product objective from "always provide a
smaller pack" to "do not provide a pack when Palace has no evidence that it is
needed."

## Bypass Contract

Automatic bypass requires all of the following:

- one high-confidence Primary source file;
- a memory preflight that finds zero relevant, current, in-scope items;
- no cross-stack dependency signal;
- no public-contract change risk;
- no tenant-isolation risk;
- no repository-wide or multi-file scope risk.

An explicitly named file can use the established 0.45 route-confidence floor.
An implicit target requires route confidence of at least 0.50 and exactly one
unique Primary source path. Library callers that do not provide memory-preflight
evidence cannot implicitly bypass.

The serialized Markdown or JSON body contains only:

```json
{
  "mode": "bypass",
  "primaryCandidate": "src/format-currency.mjs",
  "reason": "High-confidence single-file route with no relevant memory, cross-stack dependency, contract risk, or scope risk."
}
```

The Core API retains measured payload metadata outside that delivered body for
evaluation. No source drawer, support route, memory, guardrail, task restatement,
or execution narration is serialized in bypass mode.

## Guardrail Versus Route Intent

The preregistered small-local wording includes "Keep the public API stable."
Earlier analysis preserved the contract-risk distinction but still routed the
generic word `api` toward unrelated controllers. Currency literals also yielded
numeric keywords such as `00`. Version 0.3.0 removes preservation-only public
API clauses and numeric-only literals from routing keywords while retaining the
actual currency, formatting, negative, and zero intent.

## Non-Bypass Execution Boundaries

Adaptive JSON and Markdown now carry the same boundaries:

- Primary;
- Support;
- Deferred;
- Excluded;
- Required Evidence;
- Do Not;
- Stop Condition;
- Conflict Summary.

The pack budget reserves their estimated cost before source drawers are loaded.
The Codex plugin instructs the agent to read Primary and Required Evidence,
expand Deferred only after a concrete conflict, avoid Excluded paths, and stop
when targeted tests and scope checks pass.

## Product Contract Evidence

A Core end-to-end test builds an indexed repository with 240 generated
distractor files plus `src/format-currency.mjs`, then repeats the frozen
small-local task four times. Current result:

| Trial | Selected mode | Primary candidate | JSON fields | Estimated payload |
| --- | --- | --- | --- | --- |
| 1 | bypass | `src/format-currency.mjs` | 3 | <80 tokens |
| 2 | bypass | `src/format-currency.mjs` | 3 | <80 tokens |
| 3 | bypass | `src/format-currency.mjs` | 3 | <80 tokens |
| 4 | bypass | `src/format-currency.mjs` | 3 | <80 tokens |

Separate regressions prove that relevant memory selects scoped Full Palace
instead of bypass, repository-wide wording sets `scopeRisk`, cross-stack and
contract changes remain Full Palace, and all boundary fields are available in
JSON and Markdown.

## Mixed Feature-And-Release Routing

The first self-audit of this work exposed a second problem: release routing
could fill its limit with package manifests and old release notes before it
reached the implementation and regression files that actually changed. The
fix allocates requested release surfaces in rounds, applies stable priorities
inside each surface, and uses the same priorities when filling unused route
capacity. Verification scripts such as `verify-release-candidate.cjs` and
`smoke-mcp.cjs` are treated as executable test evidence rather than unrelated
source.

The permanent regression fixture contains implementation, shared transport,
tests, CLI, MCP, plugin metadata, verification scripts, manifests, and docs.
It runs the same mixed task in English and Chinese:

| Task variant | Changed-file coverage | Route focus | Route limit |
| --- | --- | --- | --- |
| English | 0.96 | 0.96 | 23 |
| Simplified Chinese | 0.96 | 0.96 | 23 |

The release confidence cap remains 0.65, so these fixture results are reported
as underconfident rather than inflating confidence to match one favorable
scenario.

## Release-Candidate Verification

| Gate | Result |
| --- | --- |
| TypeScript lint | passed |
| Core tests | 86/86 passed |
| CLI tests | 2/2 passed |
| MCP tests | 2/2 passed |
| Monorepo build | passed |
| Generated CLI | reports 0.3.0 |
| Version consistency | root, four workspaces, plugin, marketplace ref, and MCP pin all match 0.3.0 |
| Repository MCP smoke | 10 tools, version 0.3.0, passed |
| npm pack | 7 files, package id `vertex-palace@0.3.0`, SHA-1 `04602918f8e661a57c8286fb7b6d344baf9fb3aa` |
| Clean tarball install | CLI version 0.3.0, passed |
| Clean Git isolation | `palace context --auto` left `git status` empty; one `/.palace/` entry in local `.git/info/exclude` |
| Clean large-index bypass | 240 distractors, 4/4 bypass, intended target, exactly 3 fields and 200 bytes each |
| Clean relevant-memory check | switched to `full-palace`, 1 memory item included |
| Clean boundary check | all 8 boundary fields present, 958 estimated tokens within the 6,000-token ceiling |
| Clean installed MCP | 10 tools, version 0.3.0, bypass response was 189 bytes, passed |
| Reproducible command | `pnpm test:release-candidate`, passed |

The clean harness is committed as `scripts/verify-release-candidate.cjs`. It
uses a unique temporary directory, installs only the packed 0.3.0 tarball,
generates all distractors, rejects every nonzero child-process exit code, and
parses the delivered CLI JSON. Git tag, public npm, and fresh registry-install
evidence are not claimed here. npm publication is held until the research and
Control-first benchmark stages are complete, as requested; the eventual npm
authentication will use browser/device verification for user approval.

## Palace Self-Evaluation

The final built CLI routed the Chinese mixed task and evaluated that route
against every actual Git change except the user-owned untracked `image/`
directory:

| Measure | Result |
| --- | --- |
| Selected mode | `guarded-memory-palace` |
| Route limit / route files | 24 / 24 |
| Actual changed files | 30 |
| Matched files | 23 |
| Changed-file coverage | 0.77 |
| Route focus | 0.96 |
| Predicted confidence | 0.65 |
| Calibration | well-calibrated, error 0.12 |
| Delivered payload | 17,810 bytes / 4,423 estimated tokens |
| Assessment | needs review |

The seven misses were `README.md`, three repeated workspace/version surfaces,
the generated MCP bundle, the plugin skill, and the Core export barrel. One
route-only CLI command file was included. All primary behavior and regression
files, both verification scripts, shared types, CLI/MCP sources, plugin
metadata, changelog, Build Week guide, and this research record were matched.

An earlier interim audit covered 0.48 of a smaller in-progress diff and was
overconfident. The final 0.77 / 0.96 result is a useful engineering diagnostic,
but it is not a controlled before/after effect because the diff and route limit
also changed during implementation.

## Research Boundary

These are deterministic product-contract tests, not the Control-first agent
benchmark. The Adaptive arm still makes one Palace context call, so parity with
Control tool calls, cumulative reported tokens, wall time, correctness, and
scope precision remains unproven. Those claims require fresh trial IDs, fresh
seeds, balanced execution order, and the 0.3.1 protocol.

## 简体中文摘要

0.3.0 不再把“每次都给一个较小 context pack”当作目标。只有路线高信心锁定单一
Primary 文件、记忆预检确认没有相关记录，而且没有跨层、契约、客户隔离或广范围风险时，
才真正 bypass；交付内容只有模式、Primary 候选与原因。较大索引仓库的 4 次重复
small-local 合同测试全部 bypass，并稳定指向 `src/format-currency.mjs`。非 bypass
模式则明确输出 Primary、Support、Deferred、Excluded、Required Evidence、Do Not、
Stop Condition 与 Conflict Summary。这个结果证明产品合同，不代表已经证明相对纯 Codex
节省总 Token、时间或工具调用；这些必须由下一轮 Control-first benchmark 验证。

这次也修复了“功能研发加发布”任务被 package manifest 与旧发布文档占满的问题。固定回归
同时使用英文和简体中文任务，两组 changed-file coverage 与 route focus 都是 0.96。真实仓库
最终自评在 30 个改动文件中命中 23 个，coverage 0.77、focus 0.96，置信度校准为
well-calibrated；遗漏项与 `needs review` 结论完整保留。`pnpm test:release-candidate` 会自动
打包、全新安装、生成 240 个干扰文件、验证 4 次 bypass、相关记忆回退、八项边界和安装包
MCP。npm 目前仍未发布，等后续研发与 Control-first 测试完成后，再通过浏览器或设备验证由
使用者现场确认发布。
