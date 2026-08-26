# 第 13 轮 0.4 Alpha 研究生命周期路由修复结果

状态：事后观察的开发期自审，不是独立保留样本证据。

## 研究问题

当一个代码修改任务同时要求回归验证、机器证据和双语报告时，Vertex Palace 能否留在当前编号研究家族，而不是退回旧的通用路由研究？

修复前后使用完全相同的任务文本、10 个路线文件上限、6,000 Token 预算、4 个 drawers，以及同一组 15 个实际改动文件。

## 基线失败

`evaluation_247934ce4e376b45` 进入旧的 Round 7/8 校准资料，在 15 个实际改动文件中只命中 `route-planner.ts`。

| 指标 | 基线 |
| --- | ---: |
| 命中改动文件 | 1 / 15 |
| Changed-file coverage | 0.067 |
| Route focus | 0.10 |
| Route confidence | 0.40 |
| 校准 | 过度自信 |

失败来自四点：编号阶段丢失数字、比赛冻结被误当成协议/配置、证据与报告产出被误判为“实现路由词汇”，以及多表面 bugfix 仍使用单一 bugfix 分支。

## 修复内容

- 保留 `Round 13`、`round-13`、`round13` 等编号阶段身份。
- 将受限中文短语“主体归属闭环”映射到既有的 subject/owner/closure 概念。
- 将“继续优化”等延续表达识别为明确代码修改意图。
- 区分“记录机器证据”与“实现 machine-readable evidence routing”。
- 将比赛冻结视为约束，而不是配置文件请求。
- 只为多表面 bugfix 使用有界 artifact-lifecycle 选择器，不接管原本稳定的 feature/refactor 行为。
- 先选产品实现和直接产品测试，再考虑研究 tooling。
- 在所有明确编号阶段之间平衡证据与双语报告，并优先同一家族的最新 attempt。

## 同任务结果

`evaluation_41e998c519d15686` 选中了 Round 12 attempt 5、Round 11 attempt 7、对应四份双语报告、`route-planner.ts`、`router.test.ts`，以及两轮直接验证脚本。

| 指标 | 基线 | 候选版本 | 变化 |
| --- | ---: | ---: | ---: |
| 命中改动文件 | 1 / 15 | 8 / 15 | +7 |
| Changed-file coverage | 0.067 | 0.533 | +0.466 |
| Route focus | 0.10 | 0.80 | +0.70 |
| Route confidence | 0.40 | 0.40 | 不变 |
| 校准 | 过度自信 | 校准正常 | 已修复 |

针对完整实际改动集合，候选结果仍是 `needs-review`。这点被刻意保留：我们没有在看到路线后删除七个未命中项。

## 两种 Oracle

主要诊断仍是全部 15 个实际改动文件，其中包括生成后的 MCP bundle、总测试 runner、报告锁定与 lineage 测试、被后续结果取代的 attempt，以及辅助 Bat 审计；候选版本命中 8/15。

观察结果后才定义了一组次要“语义核心”，用于解释路线：八个最终产品、报告和证据文件全部命中。这个 8/8 只能作为事后诊断，不能冒充 held-out 证据。两条 verifier 脚本属于语义核心之外的有效支持资料。

## 受控回归

新的英中双语夹具同时建立当前 subject-owner-closure 家族、旧 Round 8 家族，以及同 Round 的 local-blind 竞争家族。它要求产品实现、直接产品测试、一条 verifier、最终机器证据和英中报告；结果达到完整改动文件覆盖、route focus 至少 0.875，并排除配置噪音和两个竞争家族。

## 声明边界

本结果只证明一个已观察任务和一个受控夹具上的本地静态路由修复。它不能证明 Agent 正确率、Token 节省、工具调用减少或墙钟时间下降。Round 11/12 的正式结果保持不可改写。OpenAI Build Week 冻结仍生效，所有修改仅保留在本地。

机器证据：`docs/research/evidence/research-lifecycle-routing-repair-self-audit-0.4-alpha.json`。
