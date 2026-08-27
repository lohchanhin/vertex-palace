# Room Inventory 验证协议（0.5，Round 26）

状态：方法协议已锁定，目标尚未选择。目前没有在正式目标上执行 candidate 路由。

## 研究问题

与 Vertex Palace 0.4 的 file-first 路由相比，object-first 路由能否提高精确 implementation 与聚焦 verification 物件的检索质量，同时不降低安全性、确定性、兼容性与上下文边界？

## 声明边界

Round 26 是静态物件路由资格研究，不能证明端到端 Agent 正确率、Token 节省、工具调用减少或墙钟时间加快。这些声明必须等静态路由通过后，再进行独立的随机配对 Agent 研究。

## 比较产品

Baseline 为 `vertex-palace@0.4.0`，Git tag 为 `v0.4.0`，起点 commit 为 `2d29561`。计划中的 candidate 为 `vertex-palace@0.5.0-alpha.1`，object-first 路由必须放在实验开关后面。

在执行任一条件前，必须冻结 candidate package、runner、目标 manifest、ground truth 与 hash。选择目标时不能查看 candidate 路由结果。

## 目标选择

Round 26 包含 16 个没有参与 Room Inventory 调参的全新目标：

| 语言 | 目标数 |
| --- | ---: |
| TypeScript 或 JavaScript | 4 |
| Python | 4 |
| Go | 4 |
| Rust | 4 |

四种任务轮廓各有四个目标：

1. 明确写出 function、method、def、type 或 endpoint 的精确物件任务。
2. 仓库中存在多个同名物件的消歧任务。
3. 同时需要 implementation 物件与聚焦 test 物件的跨文件任务。
4. 动态、缺失或无法解析的控制任务，正确行为应为 advisory 或 abstain。

Repository、历史任务和 truth 必须在 candidate 执行前选定。开发 fixture 或曾经修复过的目标不能算作全新资格证据。

## 真值分层

- 目标物件：真正拥有请求行为的 implementation declaration。
- 聚焦验证物件：直接验证该行为的最小 test declaration。
- 明确契约物件：任务明确要求的 type、configuration declaration、endpoint 或 documentation contract。
- 潜在附属文件：只存在于隐藏 diff 或项目惯例的范围，单独报告，观察结果后不能拿来重新定义核心失败。

Ground truth 必须在路由前，根据历史 diff、项目测试或独立代码审核记录。观察结果后不得改写 oracle。

## 执行方式

- 条件为 `0.4-file-first` 与 `0.5-object-first`。
- 每个目标和条件重复两次。
- 两种条件的执行顺序在目标间保持平衡。
- 所有运行必须依序执行，禁止并行。
- 模型、任务文本、仓库 commit、索引新鲜度、context 上限和验证命令必须相同。
- Context 上限为 6,000 estimated tokens。
- 不允许修改目标仓库的 tracked files。
- Parse、setup、timeout 与 partial failure 必须保存在第一次结果中。

## 指标

主要静态指标是精确目标物件召回率、implementation 加聚焦 test 闭合率，以及宏观 object focus。安全指标包括错误强制停止、控制任务正确 advisory 或 abstain、重复路线一致、context 上限和 tracked-file 清洁度。

工程指标包括行号移动身份保留率、相对 0.4 的索引体积倍数，以及增量索引时间回归。工程指标不能代替路由正确率。

## 冻结门槛

Round 26 必须同时满足以下全部条件：

1. 精确目标物件召回率为 `1.00`。
2. Implementation 加聚焦 test 闭合率至少为 `0.95`。
3. 宏观 object focus 至少为 `0.75`。
4. 错误强制停止为零。
5. 重复路线一致率为 `1.00`。
6. 所有 context 不超过 6,000 estimated tokens。
7. Tracked-file 污染为零。
8. 行号移动身份保留率为 `1.00`。
9. 索引体积最多为 0.4 baseline 的 `1.50` 倍。
10. 增量索引时间回归最多为相对 0.4 baseline 的 `0.25`。

## 失败政策

第一次观察结果不可覆盖。失败目标、oracle、任务或阈值都不能删除、更换或改写。每一种失败类型最多允许一次通用机制修复，旧失败样本之后只能作为回归证据。

修复后必须使用两轮全新目标重新开始资格计数。同一失败类型若在通用修复后再次出现，暂停 stable 0.5 并进行架构复审，不能继续增加目标专用规则。

## 发布决策

Round 26 通过只授权准备未改变 candidate 的全新 Round 27。Stable `0.5.0` 需要连续两轮全新资格通过、兼容测试、package 安装测试，以及独立审核 Agent 性能声明边界。
