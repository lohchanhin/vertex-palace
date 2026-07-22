# 0.4 Alpha 自审修复后路由精度结果

状态：通过预注册的已见目标回归门槛。

## 冻结证据

- 产品提交：`543a670ff06d65d8df3fe6d63f0915918812aaaf`
- 协议与执行器提交：`d71e6c463c2f78817beddba3e63be7168cbe6c30`
- 原始证据：`docs/research/evidence/route-precision-after-self-audit-0.4-alpha.json`
- 原始证据 SHA-256：`BA482B2E5B5C379A3FDD381893F354ACC76DC379B876E439F4CA584DD29C606A`
- 首次正式观察：`2026-07-22T17:12:36.247Z`
- 证据状态：`passed`，记录失败数为 0

证据文件以仅新建方式写入，并在编写本解释前单独提交，后续分析无法覆盖首次观察。

## 为什么必须做这次回归

第一个冻结候选版本保住了三个外部仓库路线，却无法找回自己刚产生的研究资料组合。结果后的三次检查都没有命中六个目标文件，而且置信度过高：

| 检查 | Evaluation ID | Coverage | Confidence | 校准 |
| --- | --- | ---: | ---: | --- |
| 简体中文 | `evaluation_aed0f811252f98e3` | 0/6 | 0.81 | overconfident |
| 英文 | `evaluation_52f0a0280b0cd1c1` | 0/6 | 0.72 | overconfident |
| 明确重建索引后的英文 | `evaluation_104e35f60fed62a0` | 0/6 | 0.72 | overconfident |

调查找到两个互相独立的产品问题：

1. 被 ignore 但已声明的生成产物会写入索引，status 却只拿一般扫描结果比较。文件数量永远不一致，使刚完成索引的自托管仓库立即变成 stale。
2. 复合研究任务没有稳定地区分测试执行器、协议、叙述结果、双语文档和机器可读 JSON 证据。JSON 证据可能占用文档名额，旧报告也可能压过当前资料家族。

本候选版本在冻结协议前，已经补上生成产物 status hash、复现实验意图与资料家族角色分配。

## 外部仓库回归

六轮预注册外部 trial 全部完成。路线保持确定性、没有越过可接受边界、selected 与 excluded 没有重叠，也没有修改目标仓库 tracked files。

| 仓库 | 路线文件 | Coverage | Focus | Confidence | 校准 | Context tokens |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Zod | 2 | 1.00 | 1.00 | 0.87 | well-calibrated | 2,277 |
| Requests | 2 | 1.00 | 1.00 | 0.72 | underconfident | 1,958 |
| p-limit | 3 | 1.00 | 0.67 | 0.55 | underconfident | 2,159 |
| Macro | - | **1.00** | **0.89** | - | 0 次 overconfident | 最大 2,277 |

这些数值复制了第一轮冻结跨仓库观察。路由修复没有破坏三个已见的 TypeScript、Python 与类型声明目标。

## Vertex Palace 中英文自审

执行器克隆产品提交，将 build 后的 `dist/palace.cjs` 作为被 ignore 但已声明的生成产物复制进去，明确执行初始化与索引，然后检查 status。即时结果为 `stale: false`。

两个语言任务都连续执行两次，并得到完全一致的路线：

| 任务语言 | Trials | 找到目标 | 路线文件 | Coverage | Focus | Confidence | 校准 | 最大 context tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| 英文 | 2/2 | 6/6 | 7 | 1.00 | 0.86 | 0.75 | underconfident | 4,827 |
| 简体中文 | 2/2 | 6/6 | 7 | 1.00 | 0.86 | 0.75 | underconfident | 4,795 |

第七个文件是预注册时已允许的 `tsconfig.base.json` 配置表面，因为任务明确要求冻结协议。两个路线都没有带入无关的旧报告。

## 探索性递归自审

这次自审发生在正式证据之后，并未预注册。它不会改变正式通过结果，但能检查修复是否泛化到这次修复研究刚产生的下一组资料。

| 范围 | Evaluation ID | 找到目标 | 路线文件 | Coverage | Focus | Confidence | 校准 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 完整实现与研究阶段 | `evaluation_4276401182cd09ce` | 3/13 | 9 | 0.23 | 0.33 | 0.78 | overconfident |
| 仅产品修复 | `evaluation_c4dfe215d01ce085` | 3/7 | 9 | 0.43 | 0.33 | 0.77 | overconfident |
| 仅新研究资料家族 | `evaluation_f728f4db638311d8` | 1/6 | 8 | 0.17 | 0.13 | 0.81 | overconfident |

三个原始 evaluation 记录均从 `.palace/evaluations/` 逐字节保存：

- `exploratory-stage-aggregate-self-evaluation-0.4-alpha.json`：SHA-256 `5379DFF58B098B3A3D57DC0E63377CE8F148D6110ED68E42CFD933FB0287077C`
- `exploratory-product-fix-self-evaluation-0.4-alpha.json`：SHA-256 `4A519F8B4A268D6A20D84324B9139BCD628651CB73D193E170F3163E3C7CAD49`
- `exploratory-recursive-artifact-family-self-evaluation-0.4-alpha.json`：SHA-256 `EEAF9531B672805505C0F81F2CCB085D3A188C1A54ED25F9D42C5AB4683DE4D6`

递归任务选择了旧的 `CROSS_REPOSITORY_ROUTE_PRECISION_*`，而不是新的 `ROUTE_PRECISION_AFTER_SELF_AUDIT_*` 家族。产品任务虽然找到三个 router 模组，却漏掉 status freshness、两组聚焦回归测试和生成的 MCP bundle。这说明第一轮修复解决了被冻结的案例，但还没有真正泛化资料家族身份与多问题角色分配。

## 产品验证

保存正式证据后，当前工作树通过：

- `npm run lint`
- `npm test`：109 个 core、2 个 CLI、2 个 MCP，共 113 个测试
- `npm run test:mcp-smoke`：10 个 MCP 工具与 guarded-memory context
- `npm run test:release-candidate`

## 解读

正式结果证明的范围明确而有限：路由修复解决了被冻结的自托管资料家族失败与永久 stale 问题，同时没有破坏三个冻结外部路线。原本明确发生的中英文 `0/6` 变成 `6/6`，focus 为 `0.86`，并且没有 overconfidence。后续探索性递归自审则证明，这项成功尚未转移到紧接着产生的新资料家族。

它**不能证明**：

- 面对从未影响研发的仓库或任务仍有相同表现；
- Agent 实际 reported Token 下降；
- 总时间或工具调用减少；
- 端到端编码任务成功率提高；
- 长期记忆已经带来收益。

外部仓库与自审都属于已见目标。时间字段也混合了冷、暖索引，只能用于诊断。

## 决策

同时记录两个结果：候选版本通过了预注册的已见目标门槛，随后在探索性递归泛化检查中失败。暂时不把这个候选版本晋级 held-out。先让资料家族选择能够泛化，保留 status 与 routing 两个不同实现角色，覆盖各自聚焦测试及生成 bundle，并在请求角色没有满足时降低 confidence。冻结下一候选版本后，预注册旧、新两组资料家族复验，再选择 held-out 仓库。
