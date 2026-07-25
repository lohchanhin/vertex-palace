# Round 4 CommonJS Import Repair Result (0.4 Alpha)

# 第四轮 CommonJS 导入修复结果（0.4 Alpha）

## Status / 状态

**Passed as a disclosed development regression.** Candidate `f61207688badbe07818470a42441a3a966a8bdf0` passed every preregistered gate on the eight already-disclosed Round 4 tasks.

**作为已公开开发回归测试，全部门槛通过。** 候选版本 `f61207688badbe07818470a42441a3a966a8bdf0` 在 8 个已经公开并用于研发的第四轮任务上，通过了所有预先登记的门槛。

This result is not new held-out or generalization evidence. It measures routing behavior only. It does not run target-repository tests and does not establish Agent correctness, end-to-end task success, Token savings, tool-call savings, or wall-time improvement.

这不是新的盲测或泛化证据。它只测量路由行为，没有执行目标仓库测试，也不能证明 Agent 正确性、端到端任务成功率、Token 节省、工具调用节省或执行时间改善。

## Frozen Evidence / 冻结证据

- Product candidate / 产品候选：`f61207688badbe07818470a42441a3a966a8bdf0`
- Validation harness / 验证执行器：`a759aa0299f68622676a8086349d07c96432f55f`
- Raw report / 原始报告：[`evidence/disclosed-cross-repository-routing-0.4-alpha-round-4-after-commonjs-import-repair.json`](evidence/disclosed-cross-repository-routing-0.4-alpha-round-4-after-commonjs-import-repair.json)
- Raw report SHA-256 / 原始报告 SHA-256：`BDD9B8904B1DA23A3A30920C58066D000134F827EDE477EEC262DDE52A26DDEB`
- Evidence-preservation commit / 证据保存提交：`99148c3`
- Original held-out observation / 最初盲测报告：[`evidence/held-out-cross-repository-routing-0.4-alpha-round-4.json`](evidence/held-out-cross-repository-routing-0.4-alpha-round-4.json)
- Original observation SHA-256 / 最初报告 SHA-256：`7B8E3833A71D60645DF134D8B87ADF49EAA5557EE59A6AB6D64A537C8A3BB5D3`

The harness writes its output with create-only semantics, verifies the candidate commit and CLI hash, verifies every target Git oracle, and rejects a dirty tracked product worktree before and after measurement.

执行器使用只新建、不覆盖的方式写入结果，并在测量前后检查候选提交、CLI 哈希、每个目标的 Git oracle，以及产品工作树是否保持干净。

## Protocol / 实验协议

| Item / 项目 | Frozen value / 固定值 |
| --- | --- |
| Repositories / 仓库 | 8 |
| Repetitions / 重复次数 | 2 per repository / 每仓库 2 次 |
| Formal trials / 正式试验 | 16, sequential / 16 次，顺序执行 |
| Oracle files / Oracle 文件 | 24 complete modified files from frozen Git diffs / 来自冻结 Git diff 的 24 个完整修改文件 |
| Context budget / 上下文预算 | 6,000 estimated tokens |
| Route limit / 路由上限 | 9, treated as a ceiling rather than a quota / 9，只是上限，不是必须填满的配额 |
| Maximum drawers / 最大抽屉数 | 4 |
| Evaluate/context retries / evaluate 与 context 重试 | 0 |
| Target tests executed / 是否执行目标仓库测试 | No / 否 |
| Target replacement after observation / 观察后替换目标 | Forbidden / 禁止 |

The pass gates required all 8 targets and all 16 trials to complete, complete implementation and path-derived test coverage for every target, macro recall of at least 0.90, macro focus and precision of at least 0.75, per-target focus and precision of at least 0.50, deterministic routes, no overconfident trials, no selected/excluded overlap, fresh indexes, and clean tracked worktrees.

通过门槛要求：8 个目标和 16 次试验全部完成；每个目标的实现文件与按路径识别的测试文件都被覆盖；宏观召回率至少 0.90；宏观焦点与精度至少 0.75；单个目标焦点与精度至少 0.50；路线必须稳定；不能出现过度自信；选中与排除范围不能重叠；索引必须新鲜；受跟踪工作树必须干净。

## Final Result / 最终结果

| Metric / 指标 | Result / 结果 | Gate / 门槛 |
| --- | ---: | ---: |
| Passed targets / 通过目标 | **8 / 8** | 8 / 8 |
| Passed trials / 通过试验 | **16 / 16** | 16 / 16 |
| Macro changed-file recall / 宏观修改文件召回率 | **1.000** | >= 0.900 |
| Macro route focus / 宏观路线焦点 | **0.771** | >= 0.750 |
| Macro route precision / 宏观路线精度 | **0.771** | >= 0.750 |
| Minimum target focus / 最低单目标焦点 | **0.500** | >= 0.500 |
| Exact-oracle targets / 完全等于 Oracle 的目标 | **4 / 8** | Reported, not gated / 仅报告，不设门槛 |
| Deterministic targets / 路线稳定目标 | **8 / 8** | 8 / 8 |
| Overconfident trials / 过度自信试验 | **0 / 16** | 0 |
| Environment/setup failures / 环境或设置失败 | **0** | 0 |
| Harness-contract failures / 执行器契约失败 | **0** | 0 |
| Product-contract failures / 产品契约失败 | **0** | 0 |
| Maximum delivered context / 最大交付上下文 | **4,631** estimated tokens | <= 6,000 |

The route selected 36 files against a 24-file oracle. Complete recall was achieved with 12 additional files. Those files keep the aggregate focus above the gate, but they show that precision remains unfinished.

路线针对 24 个 Oracle 文件共选择了 36 个文件，也就是用 12 个额外文件换得完整召回。整体焦点仍高于门槛，但这也明确说明精度仍未完成。

## Development Trajectory / 研发轨迹

| Candidate stage / 候选阶段 | Passed targets | Macro recall | Macro focus | Exact targets | Overconfident trials | Product failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original held-out observation / 最初盲测 | 2 / 8 | 0.521 | 0.375 | 1 | 6 | 6 |
| Scoped causal repair / 限定因果修复 | 3 / 8 | 0.584 | 0.449 | 1 | 6 | 5 |
| Scope graph repair / 作用域图修复 | 4 / 8 | 0.719 | 0.527 | 2 | 6 | 4 |
| Exact and causal evidence repair / 精确与因果证据修复 | 7 / 8 | 0.959 | 0.834 | 4 | 0 | 1 |
| CommonJS import repair / CommonJS 导入修复 | **8 / 8** | **1.000** | **0.771** | **4** | **0** | **0** |

The final step improved recall from 0.959 to 1.000 while reducing focus from 0.834 to 0.771. This is a measured recall/precision trade-off, not a free improvement.

最后一步把召回率从 0.959 提高到 1.000，同时把焦点从 0.834 降到 0.771。这是可以量化的召回率与精度交换，不是没有代价的提升。

## Per-Target Result / 各目标结果

| Target | Oracle files | Route files | Recall | Focus | Confidence | Calibration |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| undici | 3 | 6 | 1.000 | 0.500 | 0.40 | Underconfident / 信心偏低 |
| aiohttp | 2 | 2 | 1.000 | 1.000 | 0.64 | Underconfident / 信心偏低 |
| validator | 2 | 2 | 1.000 | 1.000 | 0.79 | Underconfident / 信心偏低 |
| tracing | 4 | 4 | 1.000 | 1.000 | 0.40 | Underconfident / 信心偏低 |
| msw | 4 | 8 | 1.000 | 0.500 | 0.90 | Well-calibrated / 校准良好 |
| uvicorn | 2 | 2 | 1.000 | 1.000 | 0.47 | Underconfident / 信心偏低 |
| gorm | 4 | 7 | 1.000 | 0.571 | 0.54 | Underconfident / 信心偏低 |
| reqwest | 3 | 5 | 1.000 | 0.600 | 0.40 | Underconfident / 信心偏低 |

All eight routes had identical membership and order across both repetitions. Determinism is useful for reproducibility, but the original held-out candidate was also deterministic while failing six targets. Determinism therefore cannot be treated as correctness.

8 个目标在两次重复中都具有相同的文件成员与顺序。稳定性有利于复现，但最初候选同样是稳定的，却失败了 6 个目标，因此稳定性不能被当作正确性。

## Root Cause and Repair / 根因与修复

The last failure was `undici`. Candidate `352c666` found `lib/util/cache.js` and `test/interceptors/cache.js`, but missed `test/cache-interceptor/utils.js`.

最后一个失败目标是 `undici`。候选 `352c666` 找到了 `lib/util/cache.js` 和 `test/interceptors/cache.js`，却漏掉了 `test/cache-interceptor/utils.js`。

The missed helper contained a literal extensionless CommonJS dependency:

```js
require('../../lib/util/cache')
```

The JavaScript parser indexed ESM imports but did not add static CommonJS `require()` targets to `ParsedFile.imports`. As a result, the real local import edge was absent. A weaker same-name symbol heuristic then connected the helper to the wrong cache module.

JavaScript 解析器会索引 ESM import，却没有把静态 CommonJS `require()` 目标加入 `ParsedFile.imports`。因此真实的本地导入边不存在，较弱的同名符号启发式反而把 helper 连到了错误的 cache 模块。

Candidate `f612076` now extracts literal static `require()` targets, deduplicates them with ESM imports, resolves extensionless local JavaScript modules through the existing resolver, and leaves dynamic `require(variable)` calls unindexed. Generic parser, indexer, and router regressions cover the behavior without repository names or issue-specific product rules.

候选 `f612076` 现在会提取字面量形式的静态 `require()` 目标，与 ESM import 去重，并通过既有解析器定位无扩展名的本地 JavaScript 模块；动态 `require(variable)` 不会被索引。解析器、索引器和路由器都有通用回归测试，产品代码没有加入仓库名或特定 issue 规则。

## Interpretation / 结果解读

1. **The routing repair is real within the disclosed regression set.** All previously observed file misses are now covered, with no environment or harness failures.
2. **Precision is still the main weakness.** Four targets are exact; `undici`, `msw`, `gorm`, and `reqwest` include additional causal or structurally related files.
3. **Confidence is conservative rather than inflated in this run.** There are no overconfident trials, but seven targets are underconfident. Confidence calibration remains useful follow-up work.
4. **The context budget gate passed, but this is not a Token-savings claim.** A bounded pack is smaller than a repository scan by construction; only a controlled Agent A/B study can establish end-to-end Token or time effects.

1. **在这组已公开回归任务中，路由修复是真实的。** 之前观察到的文件遗漏全部补齐，而且没有环境或执行器失败。
2. **精度仍是主要弱点。** 4 个目标完全等于 Oracle；`undici`、`msw`、`gorm`、`reqwest` 仍包含额外的因果或结构相关文件。
3. **本轮信心偏保守，不再虚高。** 没有过度自信试验，但有 7 个目标信心偏低，信心校准仍值得继续研发。
4. **上下文预算通过不等于已经证明节省 Token。** 有界 context pack 按定义会小于扫描整个仓库；只有受控的 Agent A/B 实验才能证明端到端 Token 或时间效果。

## Limitations / 限制

- The eight tasks were observed and used during development after the original held-out run.
- The final report cannot be used as held-out evidence or as proof of generalization.
- Git modified-file sets are practical routing oracles, but some modified files may be helpers or fixtures rather than the only files an Agent needs.
- Target tests were not executed, so this study does not measure whether an Agent can implement the fixes correctly.
- The study does not compare Codex with and without Vertex Palace on answer quality, Token use, tool calls, or wall time.

- 这 8 个任务在最初盲测之后已经被观察，并参与了后续研发。
- 最终报告不能作为盲测证据，也不能证明泛化能力。
- Git 修改文件集合是实用的路由 Oracle，但其中有些文件可能是 helper 或 fixture，不一定是 Agent 唯一需要的文件。
- 本研究没有执行目标仓库测试，因此不测量 Agent 是否能正确完成修复。
- 本研究没有比较 Codex 在使用和不使用 Vertex Palace 时的答案质量、Token、工具调用或耗时。

## Next Direction / 后续方向

1. Freeze a new Round 5 repository pool and task selector before any Palace call on those targets.
2. Preserve candidate `f612076` and its CLI hash before selecting the new tasks.
3. Run the untouched targets once as genuine held-out evidence. Failed tasks become disclosed immediately and must not remain in the held-out claim.
4. Improve precision only after the new held-out observation is frozen. Do not tune on a hidden pool and then report the same pool as unseen.
5. Keep the separate Agent A/B benchmark for Token, tool-call, wall-time, and answer-quality claims.

1. 在对目标执行任何 Palace 调用之前，冻结新的第五轮仓库池与任务选择器。
2. 在选择新任务之前，固定候选 `f612076` 及其 CLI 哈希。
3. 对从未观察过的目标只运行一次，形成真正的盲测证据；失败任务一旦被看到，就必须立即转为公开开发数据。
4. 新盲测结果冻结之后，才继续优化精度。不能在隐藏池上调参后，又把同一批任务宣称为未见数据。
5. Token、工具调用、耗时与答案质量仍由独立的 Agent A/B benchmark 负责。
