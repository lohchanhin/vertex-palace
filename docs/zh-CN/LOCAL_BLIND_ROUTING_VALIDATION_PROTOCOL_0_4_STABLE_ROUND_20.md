# 本地盲测配对路由验证协议（0.4 稳定版候选，Round 20）

## 状态与证据边界

本协议与依序排列的 48 个仓库名单，会在查询任何 Round 20 远端 HEAD、读取提交历史、选择目标或对候选任务调用 Palace 之前提交并推送。候选版本是不可变的公网包 `vertex-palace@0.4.0-alpha.1`，对照组是不可变的公网包 `vertex-palace@0.3.0`。

Round 19 及其观察后修复继续保留为已披露证据，并从本轮目标选择中排除。Round 20 是全新的静态路由研究，不执行 Agent 或目标仓库测试，因此不能单独证明端到端正确性、Token 节省、工具调用减少或运行时间改善。

## 研究问题

在 8 个从未观察过的真实仓库任务上，公网 0.4 Alpha 是否能维持或提高 0.3 的路由覆盖率与聚焦度，同时消除不安全缩窄、限制上下文大小，并提供校准过的置信度？

## 冻结输入

- 四种语言家族：JavaScript/TypeScript、Python、Go、Rust。
- 每种语言 12 个仓库，名单顺序具有约束力。
- 每种语言最先可访问的 8 个仓库构成正式仓库池。
- 每种语言按仓库顺序选择最先通过的 2 个目标。
- 每个仓库最多检查 5 个最新且机械条件合格的提交，并按新到旧审核。
- 目标必须修改 2 至 8 个文件，至少包含 1 个实现文件与 1 个聚焦测试文件。
- 每个变更 hunk 都必须与任务一致；任何不确定或无关 hunk 会淘汰整个目标，禁止只删掉部分 oracle。
- parent 到 child 的完整文件差异是 oracle。
- 在查看候选历史前冻结候选与基线包、选择代码、门槛和执行顺序。

## 配对执行

每个目标在每种条件下重复两次，依 manifest 索引平衡执行 `AB/BA`，并且全程依序运行、绝不并发。每个条件使用独立复制的 parent 工作树与全新的 Palace 索引。

验证器记录路线成员与顺序、变更文件覆盖率、路线聚焦度、置信度校准、模式、证据状态、payload Token、索引新鲜度、selected/excluded 重叠、evaluation/context 一致性、tracked worktree 修改和静态命令时间。

## 候选绝对门槛

只有全部满足以下条件才算通过：

1. 8 个目标与 16 次候选重复全部完成；
2. 8 个目标的任务类型全部正确；
3. 8 个目标的实现与路径推导聚焦测试全部覆盖；
4. 所有预先登记的辅助文件全部覆盖；
5. 两次重复的路线成员与顺序完全一致；
6. target-macro changed-file coverage 至少 `0.90`；
7. target-macro route focus 至少 `0.70`；
8. 每个目标 coverage 至少 `0.50`、focus 至少 `0.40`；
9. overconfidence、不安全窄模式与不安全强制停止全部为零；
10. metric disagreement 与 evaluation/context route disagreement 全部为零；
11. 每个 context payload 不超过 `6,000` estimated Tokens；
12. selected 与 excluded 路由边界不得重叠；
13. 所有显式索引保持新鲜，且 Palace 不得修改目标仓库的 tracked 文件。

候选的 macro coverage 或 macro focus 不得比基线低超过 `0.05`，也不得降低窄模式或强制停止安全性。

## 稳定版发布决定

只有满足以下条件，`0.4.0` 才能取代 npm `latest`：

1. Round 20 研究有效，且候选在不修改目标、oracle、阈值或产品代码的前提下通过绝对门槛；
2. 完整 workspace build、lint、test、MCP smoke、tarball 安装验证、隐私扫描与公网干净安装验证全部通过；
3. 稳定版文档明确说明这是静态路由证据，不宣称普遍提升 Agent 性能。

如果 Round 20 失败，`0.4.0-alpha.1` 继续保留在 npm `next`，`0.3.0` 继续作为 `latest`，并原样公开负面结果。只能在结果保存后开始观察后修复，而且不能让本轮事后变成通过。

## 保存方式

每个阶段都写入 create-only JSON。协议、仓库名单、产品冻结、候选队列、语义审核、目标 manifest、验证冻结和结果以哈希互相绑定。环境失败、harness 失败和产品门槛失败必须分开；已完成的负面产品结果不能重新标记成环境失败。
