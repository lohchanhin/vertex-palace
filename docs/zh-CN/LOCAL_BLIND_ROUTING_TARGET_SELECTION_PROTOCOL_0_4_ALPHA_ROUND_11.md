# 本地盲测路由目标选择协议（0.4 Alpha，Round 11）

## 当前状态

**目标选择协议已完成，尚未执行。** 目前已有一个只包含 URL 与 HEAD 的 Round 11 仓库池，但尚未查看或生成任何仓库历史、候选队列、任务、diff、一致性审核、目标 manifest 或 Palace 结果。只有匹配的 create-only 候选冻结 manifest 才能授权执行。

必须先冻结候选实现，之后才能查看任何 Round 11 仓库历史或任务。比赛结果公布前仍禁止提交与推送，因此现阶段只能使用 create-only 的本地 SHA-256 freeze。这不属于公开预注册。

## 为什么 Round 11 必须改变选样方式

Round 10 机械地把单一 parent commit 内的所有修改文件视为同一个任务 oracle。事后逐 hunk 审核发现，`itsdangerous` 的 commit subject 描述 SHA-512 fallback，但同一个 commit 还包含独立的 `SignatureExpired` 控制流修改和 pytest traceback 显示设置。

所以 Round 11 必须区分“Git commit 是原子的”和“任务语义是一致的”。一个 commit 不再自动等于一个任务。

## 研究问题

面对全新仓库以及任务语义一致的真实历史修改，冻结候选能否完整找回实现、聚焦测试与有界辅助证据，同时保持路线聚焦、置信度校准、模式选择安全，并把 delivered context 控制在 6,000 个估算 Token 内？

优先级保持不变：

1. 任务类型正确性；
2. 实现与验证覆盖；
3. changed-file 覆盖与路线聚焦；
4. 置信度校准与安全模式选择；
5. delivered payload；
6. 静态命令时间。

缺少必要证据时，更小的 payload 不算收益。

## 独立性顺序

以下顺序具有约束力：

1. 完成产品修改与全部回归验证。
2. 在不抓取 commit history 的前提下，冻结只包含 URL 与 HEAD 的全新仓库池，并递归排除以往所有已观察仓库。
3. 以 SHA-256 冻结候选源码树、CLI bundle、生成的 MCP bundle、本协议、中英文协议、仓库池、selector、classifier、一致性审核库与测试。
4. 在不调用 Palace 的情况下机械生成有序候选队列。
5. 为每个机械候选生成 create-only、逐 hunk 编址的一致性审核 packet。
6. 按冻结停止顺序审核必要候选；对每个实际审核候选，在看不到任何 Palace route、pack、confidence 或 mode 输出的情况下覆盖其全部文件和 hunk。
7. 由机器验证审核记录。只要出现一个无关或不确定 hunk，就淘汰整个 target。
8. 每个仓库选择最新的审核通过候选，再按冻结仓库顺序为每个语言家族选择前两个仓库。候选一旦通过，不再审核该仓库更旧的候选；语言配额填满后，不再审核该家族后续仓库。
9. 冻结最终 target manifest，以及每份 packet 和 review 的 hash。
10. 完成以上步骤后，才可以运行 baseline 与 candidate 静态验证。

步骤 2 到步骤 10 之间禁止修改产品代码。若产品代码发生变化，必须使用新仓库池重新开始 Round 11。

## 机械候选队列

每个仓库最多检查 300 个非 merge commit，并按从新到旧保留最多五个机械合格候选。机械条件为：

1. 只有一个可用 parent；
2. 使用未经编辑、长度 20 到 180 字符、可被冻结分类器识别的行为型 subject；
3. 修改 2 到 8 个既有文件，不允许新增、删除或重命名；
4. 至少包含一个主要语言实现文件和一个聚焦验证文件；
5. 文档或配置文件最多两个；
6. 修改行数为 2 到 400；
7. 所有 oracle 文件在 parent 与目标 commit 中都存在；
8. 完整 unified-zero diff 可以在本地取得并计算 hash。

候选队列只是证据，不是 target manifest。机械合格候选仍可能在语义审核阶段失败。审核采用提前冻结的有界顺序：同一语言家族内按仓库池顺序处理；同一仓库内按候选从新到旧处理；首个候选通过后停止该仓库审核；同一语言家族已有两个仓库通过后停止该家族审核。停止点之前的候选必须全部审核，停止点之后的候选必须明确保持未审核。此规则在看到任何任务前固定，之后不得根据审核或 Palace 结果改变。

## 任务与 diff 一致性审核

冻结 commit subject 就是任务。每个 changed hunk 必须获得一个决定：

- `task-aligned`：直接实现、验证、记录或配置任务所描述的行为；
- `unrelated`：修改了任务没有描述的独立行为或运维事项；
- `uncertain`：无法从任务、周边源码与 diff 可靠确认关系。

规则：

1. 对冻结停止规则实际到达的每个候选，其每个文件和每个 hunk 都必须且只能审核一次。
2. 只有文件内全部 hunk 都一致时，文件才可标为 `task-aligned`。
3. 一个 `unrelated` 或 `uncertain` hunk 就淘汰整个 target。
4. 禁止删减部分 oracle 文件来挽救 target。
5. Changelog 只有在描述冻结任务时才算一致。
6. 配置文件只有在执行、验证或发布冻结任务确实需要时才算一致。通用格式、traceback、timeout 或 CI 清理默认无关，除非任务明确要求。
7. 若 refactor 与独立行为修改混在一起，而 subject 没有同时说明两者，则整项淘汰。
8. 生成产物只有在负责它的生成器源码也位于 oracle，且两边都与任务一致时才可入选。最终目标最多允许一个此类例外。
9. 每个文件和 hunk 都必须填写至少 12 个字符的具体理由。
10. 禁止审核首个通过候选之后的更旧候选，也禁止审核语言家族配额填满后的后续仓库。
11. 审核完成前，对候选任务的 Palace 调用数必须为 0。

机器约束实现在 `scripts/lib/task-diff-coherence.cjs`，负责验证 packet hash、完整 hunk 覆盖、整 target 决定、审核时序声明与零 Palace 调用。

## 审核者限制

当前本地研究使用一名由开发者授权、由 Codex 协助执行的语义审核者，再加上机器完整性验证；该审核者并不独立于产品研发，也没有两名独立人工审核者，因此不能报告 inter-rater agreement。所有歧义都保守地判为淘汰，最终报告必须保留这些限制。

## 仓库与语言平衡

- 共八个目标。
- JavaScript/TypeScript、Python、Go、Rust 各两个。
- 每个语言家族冻结四个 primary/fallback 仓库。
- 递归排除以往所有已观察仓库。
- 仓库顺序交错并提前冻结。
- 被拒绝的候选和仓库都必须保留理由与审核轨迹。

## 静态验证绝对门槛

Baseline 与 candidate 使用完全相同的 route commit、任务、预算、route limit 和两次确定性重复。Candidate 必须满足：

- 8/8 目标完成；
- 8/8 路线确定性一致；
- 8/8 任务类型一致；
- 8/8 实现与验证核心表面完整；
- 所有预注册辅助表面完整；
- target-macro changed-file coverage 至少 0.90；
- target-macro route focus 至少 0.70；
- 每个目标 coverage 至少 0.50；
- 每个目标 focus 至少 0.40；
- 相对核心 oracle 的过度自信次数为 0；
- 不安全窄模式为 0；
- 错误强制停止为 0；
- 指标分歧为 0；
- evaluation/context 路线分歧为 0；
- 没有 context payload 超过 6,000 个估算 Token；
- 目标仓库 tracked worktree 变化为 0。

静态路由门槛不会执行目标仓库测试。

## 晋级规则

只有全新、有效、held-out 的 Round 11 通过绝对门槛，才可以授权另外冻结的端到端 Agent A/B 协议。Round 10 披露后修复与事后敏感性通过都只能作为诊断支持证据。
