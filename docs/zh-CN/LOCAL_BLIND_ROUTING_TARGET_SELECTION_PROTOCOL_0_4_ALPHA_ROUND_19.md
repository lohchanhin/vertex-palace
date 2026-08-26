# 本地盲测路由目标选择协议（0.4 Alpha，第 19 轮）

## 状态

有序的 48 仓库可达性 roster 已在任何第 19 轮 HEAD 查询前完成本地冻结。它递归排除截至
第 18 轮已尝试的 194 个身份，只复用 28 个从未查询的第 18 轮条目，并加入 20 个经本地
排除检查的全新条目。目前没有检查任何第 19 轮历史、任务、diff、oracle 或 Palace 结果。

这是可检查篡改的本地协议，不是公开预注册。比赛材料继续冻结：禁止 commit、push、tag、
npm 发布以及修改已提交材料。

## 可达性 Roster

第 17、18 轮证明：因为一个旧 URL 明确不存在就废掉整项研究，协议过于脆弱。第 19 轮将
基础设施可达性与产品质量选择分开：

- 冻结 48 个 URL，每个语言家族 12 个，采用固定交错顺序；
- 每个 URL 只能执行 `git ls-remote <url> HEAD`；
- 记录每个可达 HEAD 与每个明确不存在的 URL；
- 机械选择每个语言家族顺序最早的 8 个可达仓库；
- 看见结果后不得替换或重排；
- 瞬时网络错误重试耗尽，或任一语言家族少于 8 个可达条目时中止；
- canonical 32 仓库池以 create-only 写入前，不得检查历史或任务内容。

URL 可达性不得进入任何 Vertex Palace 产品表现主张。

## 候选选择

候选源码、CLI、生成 MCP、选择器、协议、完整性测试与比较基线全部通过 SHA-256 冻结后：

1. 每个仓库最多检查 300 个非 merge commit；
2. 最多保留 5 个机械合格候选，按时间从新到旧；
3. 要求单一 parent、20-180 字符行为 subject、2-8 个已存在修改文件、至少一个实现与一个
   聚焦测试、最多两个辅助文件、2-400 行改动；
4. 生成完整 unified-zero diff 与 hunk-addressed 审核包；
5. 每个 hunk 只能标为 task-aligned、unrelated 或 uncertain；
6. 任一 hunk 为 unrelated 或 uncertain 时拒绝整个目标；
7. 禁止 partial oracle pruning；
8. 接受最新的任务一致候选，并遵守仓库与语言家族停止边界。

JavaScript/TypeScript、Python、Go、Rust 每类必须 2 个目标，总计 8 个。语义审核冻结前，
对候选任务的 Palace 调用保持为 0。生成文件需要 owning generator 位于相同 oracle，整轮最多
一个 generated-artifact 目标。

## 审核限制

一位获得开发者授权的审核者使用 Codex 协助，并配合机器完整性验证。没有独立第二审核者或
inter-rater agreement；歧义一律拒绝。机器检查只能证明完整性与顺序，不能证明语义真值。

## 绝对静态门槛

冻结候选必须同时达到：

- 8/8 目标确定完成且任务类型正确；
- 8/8 实现与聚焦验证表面完整；
- 所有冻结且执行所需的辅助表面完整；
- macro changed-file coverage >= 0.90、macro route focus >= 0.70；
- 每个目标 coverage >= 0.50、focus >= 0.40；
- 过度自信、不安全窄模式与不安全强制停止均为 0；
- context/evaluation 路线或指标不一致为 0；
- 每个 context payload <= 6,000 estimated Tokens；
- 目标 worktree tracked 修改为 0。

只有冻结审核认定为执行或验证任务所必需的辅助文件才计为 required。相对公开 0.3.0 的改善
不能覆盖绝对门失败。

## 前进规则

只有新鲜的第 19 轮绝对通过，才可授权另行冻结、使用新 issue 身份与 trial ID 的 v5 Agent
A/B。失败结果保持不可改写，并驱动与仓库无关的产品修复。这项静态研究不能证明 Agent
正确率、Token 节省、工具调用减少或 wall time 下降。
