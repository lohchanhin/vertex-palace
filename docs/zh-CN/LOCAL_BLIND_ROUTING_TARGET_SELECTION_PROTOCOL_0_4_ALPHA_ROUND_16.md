# 本地盲测路由目标选择协议（0.4 Alpha，第 16 轮）

## 状态

16 个仓库的 URL+HEAD-only 仓库池已经本地冻结。目标选择尚未开始，只有匹配
的 create-only candidate-freeze manifest 才能授权执行。池冻结前没有读取
第 16 轮仓库历史、候选任务、diff、oracle 或 Palace 结果。

这是可检查篡改的本地协议，不是公开预注册。比赛冻结仍然禁止 commit、push、
tag、npm 发布以及修改投稿材料。

## 为什么需要第 16 轮

已经完成的真实仓库 v4 Agent 研究否定了 Vertex Palace 0.3.0 的普遍收益
主张：Adaptive 严格成功 3/16，Control 严格成功 11/16。后续静态研究找到
若干通用路由缺陷，第 13-15 轮也修复了研究工件家族组合、证据闭合与置信度
校准，但这些修复都来自已知或合成任务。

第 16 轮是本地 0.4 候选版本的新鲜静态确认门。它通过之前，不得设计或执行
v5 Agent A/B。

## 研究问题

在未见、任务一致的真实历史变更上，冻结的 0.4 候选能否找回必要实现与聚焦
验证证据，同时避免无关扩张、不安全停止与没有依据的高置信度？

优先级固定如下：

1. 任务类型正确；
2. 实现与聚焦验证完整；
3. changed-file coverage 与 route focus；
4. 置信度校准和安全的 advisory 模式行为；
5. context 维持有界；
6. 静态命令耗时。

较小 payload 不能补偿必要证据缺失。

## 独立性边界

第 16 轮计划递归排除第 12 轮静态路由链中的全部 161 个仓库，并单独排除
v4 Agent 研究看过、但不在该链中的 Open WebUI。因此池冻结前的排除总数
是 162。

池冻结前唯一允许的网络操作是：

```text
git ls-remote <repository-url> HEAD
```

URL+HEAD 仓库池产生前，不得 clone、fetch、遍历历史、读取 subject 或 diff、
构造任务、语义审核、构造 oracle，也不得对候选任务调用 Palace。

## 仓库平衡

- 16 个仓库，采用固定交错顺序。
- JavaScript/TypeScript、Python、Go、Rust 各 4 个。
- 每个语言家族选择 2 个目标，其余仓库作为 fallback。
- 总共选择 8 个目标。
- 所有拒绝都保留在审计记录中。

仓库知名度不是结果。仓库名称只在排除既有集合后确定，没有使用任何第 16 轮
任务内容。

## 候选选择

候选源码、CLI、生成 MCP、选择器、协议、完整性测试及比较基线全部通过
SHA-256 冻结后：

1. 每个仓库最多检查 300 个非 merge commit；
2. 最多保留 5 个机械合格候选，按时间从新到旧；
3. 要求单一 parent、20-180 字符行为 subject、2-8 个已存在修改文件、至少
   一个实现文件和一个聚焦测试、最多两个辅助文件、2-400 行改动；
4. 生成完整 unified-zero diff 与 hunk-addressed 审核包；
5. 每个 hunk 只能标为 `task-aligned`、`unrelated` 或 `uncertain`；
6. 任一 hunk 为 unrelated 或 uncertain 时拒绝整个目标；
7. 禁止只裁剪部分 oracle；
8. 选择最新通过者，并在语言家族配额填满后停止。

一个 unrelated 或 uncertain hunk 就会拒绝整个目标，禁止 partial oracle
pruning。语义审核完成前，对候选任务的 Palace 调用必须保持为 0。每个仓库在
第一个接受候选处停止，每个语言家族在接受两个仓库后停止。

生成文件只有在 owning generator 同时位于 oracle 中时才可纳入，而且整轮最多
一个 generated-artifact 目标。

## 审核者限制

语义审核由一个获得开发者授权、使用 Codex 协助的审核者完成。审核者并不独立
于产品开发，也没有第二审核者或 inter-rater agreement。所有歧义都必须保守
拒绝。机器验证只能证明审核包完整及顺序正确，不能证明语义判断本身必然正确。

## 冻结静态门槛

候选版本绝对门要求：

- 8/8 目标完成且结果确定；
- 8/8 任务类型正确；
- 8/8 实现与聚焦验证表面完整；
- 所有预注册且执行或验证所需的辅助表面完整；
- macro changed-file coverage 至少 0.90；
- macro route focus 至少 0.70；
- 每个目标 coverage 至少 0.50、focus 至少 0.40；
- 过度自信 trial 为 0；
- 不安全窄模式与不安全强制停止为 0；
- context/evaluation 路线不一致与指标不一致为 0；
- 所有 context 都不超过 6,000 estimated Token；
- 目标 worktree 没有 tracked 修改。

只有冻结语义审核认定为执行或验证任务所必需时，辅助文档或 changelog 才计入
门槛。历史 diff recall 不能强迫产品路线加入泛用文档。

公开的 0.3.0 产品只作为描述性基线。即使相对基线改善，也不能覆盖绝对门失败。

## 前进规则

只有有效且新鲜的第 16 轮绝对通过，才可授权另行冻结的 v5 Agent A/B 协议，
并且必须使用新的 issue 身份与 trial ID。若失败，原始失败必须保持不可改写，
后续只能依据失败类别进行与仓库无关的产品优化。第 13-15 轮事后观察结果不能
替代新鲜确认。

这项静态研究本身不能证明 Agent 正确率、Token 节省、工具调用减少或 wall time
下降。
