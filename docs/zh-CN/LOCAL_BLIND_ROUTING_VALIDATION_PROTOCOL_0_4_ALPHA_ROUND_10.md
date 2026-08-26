# 本地盲测成对路由验证协议（0.4 Alpha，第 10 轮）

## 状态与证据边界

本协议与 validator 在机械选择目标之后、任何选中任务第一次交给 Vertex Palace
之前完成本地哈希冻结。产品候选、基线、仓库池、目标选择规则、任务顺序与选中
manifest 已经固定。validator 使用通用 schema 编写，编写期间没有打开任务标题
或 changed-file oracle。

比赛结果冻结期禁止 commit、push、tag 与 npm publish，因此这属于内部防篡改盲测，
不是公开预注册。它可以决定研发是否进入新的 Agent 实验，但本身不能证明外部泛化。

## 研究问题

面对 8 个没有用于调整本地候选的真实仓库任务，候选是否能比改动前基线找回更多
必要证据，而且不会用漏掉证据来换取较小 payload？

本实验只评估静态路由，不要求 Agent 实作任务，因此不能宣称 Agent 正确率、
端到端 reported Token、Agent 工具调用或 Agent 执行时间有所改善。

## 冻结输入

- 目标 manifest SHA-256：
  `2E2D8BFA6867FADDF21916F80F161BCA9BFF6F4DD589BBDF4C15B2FD34067F06`
- 候选冻结清单 SHA-256：
  `F1E7EFE6D15BC279970BD7E9171E930C649941F2B272FA4394F33CC0ED48F984`
- 候选 CLI SHA-256：
  `74DE697F77B5ADA01C2DBD15646FD87FE5DA9C43763D574D21AC98C02CB27624`
- 基线 commit：
  `67c0a2ce8754cece3773d5fd16b89dae4e3af0c1`
- 离线重建基线 CLI SHA-256：
  `52A1876B00AF4AAA884A6C7EA47AC2E701E88C34FC8FEE65DD1B32BB6513B8AE`

全部验证文件与辅助 helper 会记录在另一份本地验证冻结清单。任何哈希不一致，
都必须在选中任务进入路由以前中止。

## 成对执行

目标依 manifest 顺序执行。偶数索引采用 baseline 后 candidate，奇数索引采用
candidate 后 baseline，形成 4 个 AB 与 4 个 BA；条件绝不并发。

每个目标与条件执行以下步骤：

1. materialize 完整的冻结浅层历史并核对 Git oracle；
2. 在 parent commit 建立隔离的条件仓库；
3. 不共享 `.palace`，依序执行 `init`、`index`、`status`；
4. 正式重复 2 次，每次执行 `evaluate` 后再执行 `context --auto`；
5. 由 route files 独立重算 changed-file、实现、测试与辅助覆盖；
6. 记录置信度校准、模式、证据状态、停止授权、selected/excluded 重叠、
   payload bytes、estimated Tokens 与静态命令时间；
7. 检查重复路线的成员与顺序完全一致，以及目标仓库 tracked worktree 干净。

基线 CLI 只从冻结 commit 离线重建一次并核对哈希；候选使用本地冻结 CLI。
两者采用相同预算与路线限制。

## 固定限制

- 目标：8 个，每个语言家族恰好 2 个。
- 条件：baseline 与 candidate。
- 重复：每个目标、每个条件 2 次。
- 正式静态观察：每个条件 16 次，共 32 次。
- Context 上限：6,000 estimated Tokens。
- Route 上限：10 个文件。
- Drawer 上限：4。
- 目标 fetch 深度：400 个完整浅层历史 commit。
- Materialize 最多尝试 3 次。
- 显式 index：1 次，最长 900 秒。
- `evaluate` 与 `context` 不重试。
- 校准容忍值：0.15。
- 全程顺序执行，不并发。

静态 CLI 调用次数由协议固定，不能当成 Agent tool calls。静态耗时只做描述，
因为即使平衡条件顺序，文件系统与操作系统 cache 仍无法完全消除。

## 候选绝对门槛

候选只有同时满足以下条件才算通过：

1. 8 个目标与候选的 16 次重复全部完成；
2. 8 个目标的任务类型全部正确；
3. 8 个目标的实现与路径推导聚焦测试覆盖全部完整；
4. 存在辅助 oracle 时，其覆盖必须完整；
5. 两次重复路线完全确定；
6. 目标宏平均 changed-file coverage 至少 0.90；
7. 目标宏平均 route focus 至少 0.70；
8. 每个目标 coverage 至少 0.50、focus 至少 0.40；
9. 不得出现 overconfident、覆盖不足的窄模式，或覆盖不完整却强制停止；
10. 每个 payload 不超过 6,000 estimated Tokens；
11. selected 与 excluded 边界不得重叠；
12. 显式 index 必须 fresh，Palace 不得修改目标仓库 tracked 文件。

基线使用同一套描述性门槛；基线失败不会让研究失效。

## 成对晋级规则

进入端到端 Agent 协议必须同时满足：

- 研究有效；
- 候选通过完整绝对门槛；
- 候选目标宏平均 coverage 不得比基线低超过 0.05；
- 候选目标宏平均 focus 不得比基线低超过 0.05；
- unsafe narrow mode 与覆盖不完整却强制停止的次数不得增加。

payload 或静态速度不能补救正确性与证据门失败。如果门槛未过，仍应保存为有效的
负面或混合产品结果。在 create-only 结果保存前不得根据这些任务调整产品；之后
若进行修复，第 10 轮全部任务都只能当作 disclosed regression cases。

## 证据保存

validator 只建立一次以下 create-only 正式结果：

`docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-10-attempt-1.json`

环境/设定失败、harness 失败与产品门失败必须分开。负面产品结果状态仍是
`completed`，不得改叫环境失败；只有无效研究返回失败 process status。
