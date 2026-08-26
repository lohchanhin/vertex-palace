# 本地盲测配对路由验证协议（0.4 Alpha，第 12 轮）

## 状态与证据边界

第 12 轮先选择八个整目标、任务语义一致的真实历史变更，再在任何选中任务第一次调用 Vertex Palace 前，以本地 SHA-256 冻结本协议和验证器。候选、baseline、仓库池、候选队列、逐 hunk 审核、任务顺序及最终目标清单都已先行冻结。

比赛结果公布前不能 commit 或 push，因此这是内部可检查篡改的研究，不是公开预注册。它只验证静态证据路由，不能宣称 Agent 正确率、端到端 Token 节省、Agent 工具调用减少或 Agent 执行时间下降。

## 研究问题

在八个全新仓库、任务语义一致的真实历史变更上，冻结后的 post-Round-11 focus-repair candidate 能否完整找回实现、聚焦验证与必要辅助证据，同时维持路由聚焦、置信度校准、安全模式选择，并把交付上下文控制在 6,000 estimated Tokens 以下？

固定优先级：

1. 任务类型正确；
2. 实现与聚焦验证完整；
3. changed-file coverage 与 route focus；
4. 置信度校准与安全模式；
5. 交付 payload；
6. 静态命令时间。

Payload 与静态速度不能补救正确性、证据门或安全停止失败。

## 冻结输入

验证冻结以 SHA-256 绑定：

- 第 12 轮目标清单与八份 coherence packet hash；
- candidate freeze、源码树、CLI 与生成 MCP；
- pre-repair baseline commit 与离线重建 CLI hash；
- 中英文协议；
- 验证器、冻结器、完整性测试、telemetry helper 与任务 classifier；
- 候选队列、语义审核包与审核生成脚本。

任何 hash 不符都会在选中任务被路由前中止。第一份 create-only 正式结果保存前，禁止修改产品源码。

## 配对执行

目标按冻结清单顺序串行执行。偶数 index 使用 baseline 后 candidate，奇数 index 使用 candidate 后 baseline，形成四个 AB 与四个 BA；两条件绝不并发。

每个目标、每个条件会：

1. 取得冻结的完整浅历史并验证 Git oracle；
2. 在目标变更的 parent 建立隔离仓库；
3. 以 `init`、`index`、`status` 建立全新 `.palace`；
4. 正式重复两次 `evaluate` 后 `context --auto`；
5. 独立重算 changed-file、implementation、focused-test 与 auxiliary coverage；
6. 记录 confidence、mode、evidence status、stop enforcement、selected/excluded overlap、payload 与静态耗时；
7. 检查 deterministic route、fresh index、指标一致性及 clean tracked worktree。

静态门槛不运行目标测试，也不运行 coding Agent。

## 固定限制

- 八个目标，每语言两个。
- Baseline 与 candidate 两条件。
- 每条件每目标重复两次，共 32 个正式观察。
- 上下文上限 6,000 estimated Tokens。
- Route limit 10，最大 drawers 4。
- 历史深度 400 个完整浅历史 commit。
- Materialization 最多三次。
- Index 只尝试一次，上限 900 秒。
- `evaluate` 与 `context` 不重试。
- Calibration tolerance 0.15。
- 全程串行，绝不并发。

即使采用平衡执行顺序，操作系统与文件系统 cache 仍不完美，因此静态时间只作描述。

## Candidate 绝对门槛

Candidate 只有在以下全部成立时通过：

1. 8/8 目标与 16 次 candidate repetition 完成；
2. 8/8 任务类型正确；
3. 8/8 implementation 与路径推导 focused test 完整；
4. 全部预注册 auxiliary surface 完整；
5. 两次重复的 route membership 与顺序一致；
6. target-macro changed-file coverage 至少 0.90；
7. target-macro route focus 至少 0.70；
8. 每目标 coverage 至少 0.50、focus 至少 0.40；
9. overconfidence、unsafe narrow mode、unsafe enforced stop 全为 0；
10. metric disagreement 与 evaluate/context route disagreement 全为 0；
11. 每个 context payload 不超过 6,000 estimated Tokens；
12. selected 与 excluded 不重叠；
13. index 全部 fresh，Palace 不修改目标仓库的 tracked 文件。

Baseline 使用同一套描述性门槛；baseline 失败不会使研究无效。

## 晋级规则

进入另行冻结的端到端 Agent A/B 需要：研究有效完成、candidate 通过全部绝对门槛、macro coverage 与 focus 均不比 baseline 低超过 0.05，且 unsafe narrow mode 与 unsafe enforced stop 不增加。

若门槛失败，第一份结果仍是有效的负面或混合结果；观察后不得删除目标，也不得在保存结果前调产品。之后若研发修复，第 12 轮全部目标都会转为公开回归案例。

## 证据保存

验证器只写一份 create-only 正式结果：

`docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-12-attempt-1.json`

环境、harness 与产品门槛失败必须分开。完成的负面产品结果不能改名为环境失败；只有研究无效时才返回失败状态。
