# Core Evidence-Closure Optimization Result 0.4 Alpha

Status: local disclosed regression passed; not a held-out result and not a release claim.

## Objective

Return Vertex Palace to its original product goal: give Codex a smaller, more relevant, and auditable context without authorizing an early stop before the task's required evidence is present.

This slice addressed three general failures observed in the Codex session audit:

1. Meta, evaluation, and usage-audit tasks could be classified as ordinary refactors.
2. Route confidence could look plausible while required implementation, verification, documentation, tooling, or machine-evidence roles were unresolved.
3. `palace evaluate` measured the legacy drawer pack instead of the adaptive payload that `palace context --auto` actually delivered.

## Disclosed Regression Task

> 分析所有可访问的 Codex 对话中 Vertex Palace 的真实使用状况，量化可靠性并提出优化方向

The five actual artifacts were:

- `scripts/research/audit-codex-palace-usage.cjs`
- `scripts/research/summarize-codex-palace-usage-audit.cjs`
- `docs/research/evidence/codex-palace-usage-audit.json`
- `docs/research/evidence/codex-palace-usage-summary.json`
- `docs/research/CODEX_SESSION_USAGE_AUDIT_2026-08-09.md`

## Before and After

| Metric | Before | After |
| --- | ---: | ---: |
| Task type | `refactor` | `evaluation` |
| Changed files found | 0/5 | 5/5 |
| Changed-file coverage | 0% | 100% |
| Route focus | 0% | 83% |
| Route confidence | 0.68 | 0.72 |
| Calibration | overconfident | underconfident |
| Route files | 10 unrelated product files | 6 research artifacts, including all five targets |

Baseline evaluation: `evaluation_8c1af9099b05e7ff`.

Current evaluation: `evaluation_595e225440cc6ba4`.

## Measurement Repair

The first post-routing evaluation found all five files but reported `2,029,921` pack tokens. That number came from the legacy packer accepting an oversized first drawer; it did not represent the bounded adaptive payload shown to Codex.

`palace context --auto` and `palace evaluate` now share one mode-selection, memory-preflight, and adaptive-packing path. The corrected evaluation records:

- measurement: `adaptive-delivered-payload`
- delivery mode: `full-palace`
- payload: 12,493 bytes
- estimated payload tokens: 3,108
- selected token ceiling: 6,000
- indexed repository estimate: 3,098,474 tokens
- changed-file coverage: 100%
- route focus: 83%

The repository-to-pack comparison is a static context-size estimate. It is not proof of lower end-to-end Codex billing, wall time, tool calls, or task completion cost.

## Compound Implementation Self-Audit

After the usage-audit regression passed, the implementation was evaluated with a broader disclosed task covering task intent, evidence sufficiency, context mode, adaptive payload accounting, and regressions. The changed-file oracle contained 16 product or test files plus the two retrospective records created after implementation.

| Iteration | Task type | Files found | Coverage | Focus | Calibration |
| --- | --- | ---: | ---: | ---: | --- |
| Before primary-action repair | `evaluation` | 1/18 | 6% | 17% | overconfident |
| After primary-action repair | `refactor` | 10/18 | 56% | 50% | underconfident |
| After relevance-ranked causal expansion | `refactor` | 13/18 | 72% | 65% | well-calibrated |
| After concern-specific test allocation | `refactor` | 16/18 | 89% | 80% | underconfident |

Final evaluation: `evaluation_a28320ea7aa66ab8`.

The final route found all 16 product and regression files. The only two misses were this retrospective Markdown report and its machine-readable result, which were not requested as deliverables and were authored after the implementation. Four additional product support files remained route-only. Confidence stayed conservative at `0.40`; this avoids false certainty but still requires calibration on unseen tasks.

## Verification

- TypeScript type check passed.
- Core: 14 files and 177 tests passed.
- CLI: 2 files and 2 tests passed.
- MCP: 1 file and 2 tests passed.
- Build passed for shared, core, CLI, MCP, generated plugin MCP, and packaged CLI.
- MCP smoke test passed with 10 tools.
- A new oversized-primary-artifact regression proves that evaluation remains within the selected adaptive token ceiling.

## Remaining Limits

- This is a disclosed, development-influenced regression, not held-out evidence.
- The route still included one older audit report, leaving focus at 83% rather than 100%.
- Evidence closure remained advisory because one required role pair was not causally connected.
- Confidence is conservative for this case, but calibration still needs fresh unseen tasks.
- End-to-end benefit must be tested with paired coding outcomes, not inferred from repository-to-pack estimates.
- The compound self-audit was used iteratively during development and therefore cannot be reused as confirmation evidence.

## Next Gate

Freeze the implementation only after the local diff is reviewed. Then preregister a fresh task set that did not influence this repair and measure correctness first, followed by changed-file coverage, route focus, delivered payload tokens, tool calls, and wall time. Do not tune against those held-out results.

## 简体中文摘要

这轮优化不是针对单一文件写死规则，而是把核心重新定义为“证据闭环”：任务必须先识别需要哪些证据角色，再决定路线是否足以缩小上下文或授权停止。

同一条已公开的真实审计任务，从 `0/5` 文件命中、`0%` 覆盖、`0%` 聚焦，改善为 `5/5` 命中、`100%` 覆盖、`83%` 聚焦。任务类型也从错误的 `refactor` 修正为 `evaluation`。

同时修复了评估计量错误。此前 `palace evaluate` 把旧式超大 drawer 误报为约 203 万 tokens；现在它与 `palace context --auto` 共用实际交付流程，正确记录为 3,108 estimated tokens，并受 6,000 token ceiling 限制。

更广的复合研发任务也从最初 `1/18` 命中、`6%` 覆盖、`17%` 聚焦，逐步改善到 `16/18` 命中、`89%` 总覆盖、`80%` 聚焦。两个未命中项是实现完成后才新增的研究记录；只计算产品代码和测试则为 `16/16`。这组数据参与了开发调试，因此只能作为公开回归记录，不能当成盲测成绩。

这只能证明该公开回归已修复，不能证明所有项目都会更快或更省 Token。下一阶段必须使用全新的预注册盲测任务，优先验证任务正确性，再比较覆盖率、聚焦度、实际交付上下文、工具调用和时间。
