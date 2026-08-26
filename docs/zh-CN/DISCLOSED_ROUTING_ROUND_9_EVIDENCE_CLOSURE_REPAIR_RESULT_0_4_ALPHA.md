# Round 9 证据闭环修复披露结果（0.4 Alpha）

## 状态

不可变更的 Round 9 正式候选门槛仍然是**失败**。本文记录的是在同一批已经看过的 8 项任务上进行的披露后回归，只能作为诊断与修复证据，不能当成新的盲测结果。

Attempt 3 完成全部 8 项并通过披露后的核心门槛。实验只执行静态索引、路由评估与 context pack，没有执行目标仓库测试，也没有让 Agent 实际修改代码。

## 证据链

1. Round 9 正式 Attempt 2 完整执行但失败：仅 3/8 项通过，6/8 项完整命中实现与测试，宏观 changed-file coverage 为 0.792，宏观 route focus 为 0.499，并出现 2 次危险窄路线。
2. 披露 Attempt 1 被保留为无效测试器证据。它没有移除 `:87-117` 这类行号范围，造成假的 evaluate/context 分歧。
3. 披露 Attempt 2 只修复测试器问题并通过核心门槛，但 `smallvec` 与 `ramda` 仍各自保留 5 个文件，宏观 route focus 为 0.808。
4. 披露 Attempt 3 加入通用的模块镜像与新增外部契约修复，8 项全部通过，宏观 route focus 提升到 0.958。

## 汇总结果

| 指标 | 正式候选 | 披露 Attempt 3 |
| --- | ---: | ---: |
| 通过项目 | 3/8 | 8/8 |
| 核心实现/测试完整项目 | 6/8 | 8/8 |
| 宏观 changed-file coverage | 0.792 | 0.927 |
| 宏观 route focus | 0.499 | 0.958 |
| 最低单项目标 focus | 0.125 | 0.667 |
| 危险窄路线次数 | 2 | 0 |
| 度量不一致次数 | 6 | 0 |
| 环境或准备失败 | 0 | 0 |

每个目标重复两次，路由顺序与成员完全一致；没有修改任何目标仓库的 tracked 文件；所有 context 都低于 6,000 Token 上限；正确移除行号位置后，evaluate 与 context 的文件集合一致。

## 单项目结果

| 目标 | 正式文件数 | 修复后文件数 | 正式 focus | 修复后 focus | 修复后路线 |
| --- | ---: | ---: | ---: | ---: | --- |
| eslint | 2 | 2 | 1.000 | 1.000 | 规则实现 + 聚焦测试 |
| fsnotify | 10 | 2 | 0.200 | 1.000 | `fsnotify.go` + `fsnotify_test.go` |
| smallvec | 5 | 3 | 0.400 | 1.000 | `src/lib.rs` + `Cargo.toml` + `src/tests.rs` |
| ramda | 5 | 2 | 0.400 | 1.000 | `_equals.js` + `test/equals.js` |
| structlog | 3 | 3 | 0.667 | 0.667 | processor + 相关 stdlib 表面 + 聚焦测试 |
| go-kit | 2 | 2 | 1.000 | 1.000 | instancer + 聚焦测试 |
| rand | 10 | 3 | 0.200 | 1.000 | Pert 实现 + 套件边界 + 稳定性测试 |
| pendulum | 8 | 2 | 0.125 | 1.000 | 日文 locale 实现 + formatter 测试 |

## 通用修复

- 自动 `bypass` 与 `route-lite` 在证据不足或冲突时升级为 advisory `full-palace`。
- `Add()`、`Remove()` 等显式调用标识不会再被动作停用词过滤掉。
- fixture、testdata、fuzz 与 benchmark 被归类为验证证据，不再冒充主要实现。
- 因果扩展被限制在主要 package 与任务点名模块内。
- 当任务点名实现模块，且存在结构明确的同名测试时，即使未来行为文字尚未出现在旧代码中，也能及时停止，不再扩展到词汇相似的集合辅助模块。
- 新增外部 trait/interface 的 feature 会定位目标类型、最近的 package manifest 与主测试，不再追逐 fuzz/benchmark 的相似词。
- Python 顶层赋值与多行 locale 字典会被索引为常量。
- 指定 locale 身份与 locale 测试短语会参与实现/测试配对。

## 限制

- 这 8 项任务已经被观察，Attempt 3 不能证明泛化能力。
- Oracle 来自冻结的 Git changed-file diff。changelog 与 package/config 会和核心实现/测试分开报告，因为它们可能只是提交记录，也可能是必要构建边界。
- 没有执行目标测试、Agent 任务、正确性结果、reported Token、工具调用或墙钟时间测量。
- 核心校准 MAE 为 0.418；没有过度自信，但候选明显偏保守。
- 这次披露静态回归不能支持效率或端到端生产力结论。

## 下一道门槛

冻结当前修复版本，再建立全新的 Round 10。其仓库、任务与 oracle 在修复期间都不能被观察。只有新的静态门槛通过后，才允许进入 Agent A/B 协议。
