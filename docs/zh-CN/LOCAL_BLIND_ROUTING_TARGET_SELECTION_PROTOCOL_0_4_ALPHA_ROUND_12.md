# 本地盲测路由目标选择协议（0.4 Alpha，第 12 轮）

## 状态

**选择协议与仅含 URL、远端 HEAD 的仓库池已经在本地冻结，目标选择尚未开始。** 仓库池写入前，没有读取第 12 轮仓库历史、候选任务、diff、语义审核、oracle 或 Palace 输出。只有匹配的 create-only 候选冻结清单才能授权后续执行。

比赛结果公布前仍禁止 commit 与 push，因此本轮以本地 SHA-256 绑定候选与协议。这是可检查篡改的本地预注册，不是公开预注册。

## 为什么需要第 12 轮

第 11 轮虽然提高了 changed-file recall，但没有通过绝对门槛。之后的 ownership closure、公共 API contract closure 与证据预算裁剪，只在已经公开给研发使用的第 11 轮目标上验证。最终 focus repair 在这些已知目标达到 8/8 核心覆盖与 0.701 macro focus，但不能证明对新仓库也成立。

第 12 轮是 post-Round-11 候选第一次真正的新样本确认。第 1 至 11 轮完整排除链里已经观察过的 145 个仓库全部递归排除。

## 研究问题

在全新仓库及任务语义一致的真实历史变更上，冻结后的候选能否完整找回实现、聚焦测试和必要辅助证据，同时维持聚焦路由、校准后的置信度、安全模式选择，并把交付上下文控制在 6,000 estimated Tokens 以下？

固定优先级为：

1. 任务类型正确；
2. 实现与验证覆盖完整；
3. changed-file coverage 与 route focus；
4. 置信度校准与安全模式；
5. 交付 payload；
6. 静态命令时间。

上下文变小不能抵消必要证据缺失。

## 不可更改的独立性顺序

1. 完成产品修改与回归验证。
2. 在不抓取历史的前提下，冻结只含 URL 与 HEAD、并递归排除过去 145 个仓库的新仓库池。
3. 以 SHA-256 冻结候选源码、CLI、MCP、协议、仓库池、选择器、语义审核机械与测试。
4. 不调用 Palace，机械生成有序候选队列。
5. 为候选生成 create-only、逐 hunk 定址的审核包。
6. 按冻结停止顺序审核，不查看任何 Palace route、pack、confidence 或 mode。
7. 任一 hunk 无关或不确定，整个目标淘汰。
8. 每仓库选择最新通过候选；每语言选择最早两个通过仓库。
9. 冻结最终目标清单、审核、验证协议、验证器和全部哈希。
10. 之后才允许执行 baseline 与 candidate 静态验证。

第 2 至第 10 步之间不得修改产品源码；一旦修改，本轮必须以新仓库池和新 attempt 重新开始。

## 机械候选规则

每仓库最多检查 300 个非 merge commit，按从新到旧保留最多五个候选。候选必须：

1. 只有一个可用 parent；
2. 使用原始、20 至 180 字符的行为型 subject，并由冻结 classifier 分类；
3. 修改 2 至 8 个既有文件，不允许新增、删除或 rename；
4. 至少有一个主要语言实现文件和一个聚焦验证文件；
5. 文档或配置文件不超过两个；
6. changed lines 为 2 至 400；
7. 所有 oracle 文件在 parent 与目标 commit 都存在；
8. 完整 unified-zero diff 可取得并可哈希。

仓库使用冻结的四语言交错顺序；候选按 newest-first。仓库在第一个通过候选处停止，语言族在两个仓库通过后停止。停止点之后的候选与仓库必须明确保持未审核。

## Task-Diff 语义一致性审核

冻结 commit subject 就是任务。每个 changed hunk 必须且只能标记为 `task-aligned`、`unrelated` 或 `uncertain`。

1. 冻结停止顺序触及的每个文件和 hunk 都必须审核。
2. 文件只有在全部 hunk 对齐时才算对齐。
3. 一个无关或不确定 hunk 就淘汰整个目标。
4. 禁止删除部分 oracle 来挽救候选。
5. 文档与配置只有在任务明确需要时才算对齐。
6. 生成物只有在 owner generator 同时进入 oracle 时才可使用，且最多一个目标使用此例外。
7. 每个文件与 hunk 都要写至少 12 字符的具体理由。
8. 审核最终化前，候选任务上的 Palace 调用必须为 0。

`scripts/lib/task-diff-coherence.cjs` 会机械验证 hash、hunk 完整性、整目标决策、时间声明及 no-Palace 条件。

## 审核限制

目前只有一位开发者授权、由 Codex 协助的语义审核者，以及机械完整性检查。审核者并非独立于产品研发，也没有第二位独立人类审核者或 inter-rater agreement。模糊候选一律保守淘汰，结果报告必须保留这项限制。

## 仓库平衡

- 选择八个目标。
- JavaScript/TypeScript、Python、Go、Rust 各两个。
- 每语言四个主选/备用仓库。
- 递归排除过去观察过的 145 个仓库。
- 仓库顺序按四语言交错冻结。
- 所有淘汰理由保留在审计轨迹中。

## 静态验证门槛

Baseline 与 candidate 使用相同任务、commit、限制和两次确定性重复。Candidate 必须满足：

- 8/8 完成且 route deterministic；
- 8/8 任务类型正确；
- 8/8 实现与聚焦验证完整；
- 全部预注册辅助证据完整；
- macro changed-file coverage 至少 0.90；
- macro route focus 至少 0.70；
- 每目标 coverage 至少 0.50、focus 至少 0.40；
- overconfidence、unsafe narrow mode、unsafe enforced stop、metric disagreement、evaluate/context disagreement 全部为 0；
- 每个 context payload 不超过 6,000 estimated Tokens；
- 目标仓库没有 tracked worktree 修改。

静态门槛不运行目标测试，也不运行 coding Agent。

## 晋级规则

只有有效且新鲜的第 12 轮绝对通过，才可授权另行冻结的端到端 Agent A/B。第 11 轮公开维修结果仍只是诊断证据，不能替代本轮确认。
