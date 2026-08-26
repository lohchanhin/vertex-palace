# 本地盲测路由目标选择协议（0.4 Alpha，第 18 轮）

## 状态与谱系

第 18 轮仓库计划已在任何第 18 轮 HEAD 查询前完成本地冻结。它承接已保留的第 17 轮无效
URL 失败；该失败发生在历史或产品暴露之前，因此没有产生 Vertex Palace 产品结果。

计划递归排除 190 个仓库身份：截至第 16 轮的 178 个，以及第 17 轮已经尝试 HEAD 查询的
12 个。它只复用第 17 轮从未查询的 20 个仓库，并在任何网络操作前加入 12 个全新仓库。
这是可检查篡改的本地协议，不是公开预注册。比赛材料继续冻结：禁止 commit、push、tag、
npm 发布以及修改已提交材料。

## 固定设计

- 32 个仓库，采用固定交错顺序。
- JavaScript/TypeScript、Python、Go、Rust 各 8 个。
- 每类接受 2 个目标，总共 8 个目标。
- 后续仓库作为 fallback；某类接受 2 个后立即停止。
- 每次拒绝与基础设施失败都保留在审计记录中。
- 语义审核冻结前，对候选任务的 Palace 调用保持为 0。

扩大 fallback 容量只回应第 16 轮的机械可行性不足，不降低最终配额或任何产品门槛。

## 仓库池前边界

canonical 仓库池存在前唯一允许的网络命令是：

```text
git ls-remote <repository-url> HEAD
```

不得 clone、fetch、检查历史、读取 subject 或 diff、构造任务、进行语义审核、构造 oracle，
也不得对候选任务调用 Palace。冻结器以 create-only 写 canonical 输出；若失败，则必须改为
写入包含已完成尝试与精确诊断的 create-only 失败记录，不得在本轮内替换失败仓库。

## 候选选择

源码、CLI、生成 MCP、选择器、协议、完整性测试与比较基线全部通过 SHA-256 冻结后：

1. 每个仓库最多检查 300 个非 merge commit；
2. 最多保留 5 个机械合格候选，按时间从新到旧；
3. 要求单一 parent、20-180 字符行为 subject、2-8 个已存在修改文件、至少一个实现文件和
   一个聚焦测试、最多两个辅助文件、2-400 行改动；
4. 生成完整 unified-zero diff 与 hunk-addressed 审核包；
5. 每个 hunk 只能标为 task-aligned、unrelated 或 uncertain；
6. 任一 hunk 为 unrelated 或 uncertain 时拒绝整个目标；
7. 禁止 partial oracle pruning；
8. 接受最新的任务一致候选，并遵守仓库与语言家族停止边界。

生成文件只有在 owning generator 同时位于相同 oracle 时才可纳入，而且整轮最多一个
generated-artifact 目标。

## 审核限制

一位获得开发者授权的审核者使用 Codex 协助，并配合机器完整性验证。没有独立第二审核者或
inter-rater agreement；歧义必须拒绝。机器检查只能证明审核包完整与顺序正确，不能证明
语义判断本身必然正确。

## 绝对静态门槛

冻结候选必须同时达到：

- 8/8 目标完成且结果确定；
- 8/8 任务类型正确；
- 8/8 实现与聚焦验证表面完整；
- 所有冻结且执行所需的辅助表面完整；
- macro changed-file coverage >= 0.90；
- macro route focus >= 0.70；
- 每个目标 coverage >= 0.50 且 focus >= 0.40；
- 过度自信 trial 为 0；
- 不安全窄模式或强制停止为 0；
- context/evaluation 路线或指标不一致为 0；
- 每个 context payload <= 6,000 estimated Tokens；
- 目标 worktree tracked 修改为 0。

只有冻结审核认定为执行或验证任务所必需的辅助文件才计为 required。历史 diff recall 不能
强迫产品路线加入泛用文档。相对公开 0.3.0 的改善不能覆盖绝对门失败。

## 前进规则

只有有效且新鲜的第 18 轮绝对通过，才可授权另行冻结、使用新 issue 与 trial ID 的 v5
Agent A/B。若失败，结果保持不可改写，并驱动与仓库无关的产品修复。这项静态研究本身不能
证明 Agent 正确率、Token 节省、工具调用减少或 wall time 下降。
