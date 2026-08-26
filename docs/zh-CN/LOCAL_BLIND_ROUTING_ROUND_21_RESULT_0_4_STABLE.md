# 本地盲测路由 Round 21 结果（0.4 稳定候选版）

状态：**已完成、结果有效，但未通过稳定版发布门槛**。

本轮不能把 Vertex Palace `0.4.0` 发布到 npm `latest`。公开稳定版继续保留
`0.3.0`，`next` 继续保留 `0.4.0-alpha.1`。

## 结论边界

Round 21 是一次新的、公开预注册、本地哈希冻结的配对静态路由研究。目标选择、
整份 diff 语义审核、产品产物、公开 `0.3.0` 基线、验证器和所有门槛，都在任何
入选任务送入 Palace 前完成冻结并推送到 GitHub。

本研究没有执行目标仓库测试，也没有运行 Agent，因此不能证明端到端正确性、
Agent 实际 Token 节省、工具调用减少或 Agent 总耗时改善。

原始结果 SHA-256：
`37425E723EA48EF513A9DE35B8AEB0E407FBC6FEACA1E2C8CF7700A44B3EBBBF`。

## 目标选择过程

- 预注册 48 个仓库 URL。
- 43 个可访问，5 个明确不存在。
- 冻结池包含 32 个仓库，每种语言族 8 个。
- 在 0 次 Palace 调用下找到 94 个机械候选。
- 对 11 个完整目标逐 hunk 进行语义审核。
- 3 个候选因夹带无关或无法确认的 hunk 被整项拒绝。
- 最终选择 8 个目标：JavaScript/TypeScript、Python、Go、Rust 各 2 个。
- 验证冻结前，对入选任务的 Palace 调用数为 `0`。

## 0.4.0 候选版绝对结果

| 指标 | 门槛 | `0.4.0` 候选版 | 结果 |
| --- | ---: | ---: | --- |
| 完成且确定性的试验 | 16/16 | 16/16 | 通过 |
| 任务类型正确 | 8/8 | 8/8 | 通过 |
| 通过目标 | 8/8 | 4/8 | 失败 |
| 实现与聚焦测试完整 | 8/8 | 7/8 | 失败 |
| 有界辅助文件完整 | 2/2 | 1/2 | 失败 |
| 目标宏平均文件覆盖率 | >= 0.900 | 0.833 | 失败 |
| 目标宏平均路由聚焦度 | >= 0.700 | 0.653 | 失败 |
| 单目标最低覆盖率 | >= 0.500 | 0.000 | 失败 |
| 单目标最低聚焦度 | >= 0.400 | 0.000 | 失败 |
| 过度自信试验 | 0 | 0 | 通过 |
| 不安全窄模式/强制停止 | 0 | 0 | 通过 |
| 指标与上下文不一致 | 0 | 0 | 通过 |
| Payload 上限 | <= 6000 | 最高 5625 | 通过 |

## 各目标表现

| 目标 | 覆盖率 | 聚焦度 | 结果 | 主要观察 |
| --- | ---: | ---: | --- | --- |
| `npm-run-path` | 1.000 | 1.000 | 通过 | 五个公开契约文件完整命中。 |
| `cli-truncate` | 1.000 | 1.000 | 通过 | 精确命中实现与测试。 |
| `outcome` | 1.000 | 0.667 | 通过 | 命中实现、回归测试和一个支持文件。 |
| `async-timeout` | 0.667 | 1.000 | 失败 | 代码与测试正确，但遗漏 `CHANGES.rst`。 |
| `go-shellwords` | 1.000 | 1.000 | 通过 | 拒绝夹带内容的新候选后，精确命中实现与测试。 |
| `go-sqlite3` | 1.000 | 0.333 | 失败 | Oracle 完整，但多带四个 binding/trace/example 文件。 |
| `indicatif` | 1.000 | 0.222 | 失败 | Oracle 完整，但多带七个宽泛的进度与渲染支持文件。 |
| `nom` | 0.000 | 0.000 | 失败 | 只有 issue 编号的任务被路由到无关示例，遗漏 `src/traits.rs` 与 `tests/issues.rs`。 |

## 与公开 0.3.0 的比较

候选版通过 4 个目标，公开基线只通过 1 个；候选版消除了 2 次不安全窄模式，
也消除了所有指标不一致和 evaluation/context 不一致，并把宏平均聚焦度提高
`0.150`。

但这些改善无法抵消宏平均覆盖率下降 `0.112`。基线在两个不透明任务上没有产出
可用路线，因此只有 6 个目标形成完整配对。候选版的上下文也更大：平均估算增加
约 `1529` Token，静态命令总耗时增加约 `53.4` 秒。这些只是路由验证器指标，
不能当作 Agent 实际 Token 或端到端耗时结论。

## 失败告诉我们的事

1. **安全性已经改善，但还不够。** 保守置信度与 advisory full-palace 避免了危险
   停止，却经常在 Primary 已经正确时继续扩大上下文。
2. **只有 issue 编号的任务信息不足。** `Fix for issue 1808` 没有行为、Symbol 或
   文件词汇，无法仅靠本地任务文本定位实现。工具需要在可用时读取 issue 元数据，
   否则应明确说明本地证据无法识别任务。
3. **大型源码枢纽的证据闭包过宽。** `go-sqlite3` 与 `indicatif` 都找到完整 Oracle，
   但又沿高连接度图节点扩张了过多无关文件。
4. **辅助文件闭包偏弱。** `async-timeout` 找到实现和测试，却没有带上有界的回归
   更新说明。
5. **本轮候选全部进入 full-palace。** 需要一种“保留已验证 Primary，只补缺失证据
   面”的有界不确定模式。

## 观察后的研发方向

Round 21 不会被改写，也不能反过来证明 `0.4.0` 合格。后续候选必须把这些问题
做成仓库无关策略，并通过新的盲测：

1. 为只有 issue/PR 编号的任务增加明确路径，包括本地 issue 测试约定与可选的外部
   issue 元数据；
2. 图扩张同时计算“任务证据增益”和“节点度数惩罚”，避免只因文件处于中心位置就
   扇出大量邻居；
3. 实现与聚焦验证证据完整后停止扩张，除非还缺少有界公开契约或更新说明；
4. 用有界不确定模式替代低证据时无条件 full-palace 打包；
5. 已公开的 Round 21 任务只能用于回归测试；稳定版发布前必须再预注册一组全新的
   仓库与任务。

## 证据

- [研究协议](LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_STABLE_ROUND_21.md)
- [仓库池](../research/evidence/local-blind-routing-repository-pool-0.4-stable-round-21.json)
- [候选冻结](../research/evidence/local-blind-candidate-freeze-0.4-stable-round-21.json)
- [语义审核](../research/evidence/local-blind-routing-coherence-reviews-0.4-stable-round-21.json)
- [目标清单](../research/evidence/local-blind-routing-target-manifest-0.4-stable-round-21.json)
- [验证冻结](../research/evidence/local-blind-routing-validation-freeze-0.4-stable-round-21.json)
- [原始结果](../research/evidence/local-blind-routing-validation-0.4-stable-round-21.json)

因此本轮发布结论不变：不要从 Round 21 把 `0.4.0` 发布到 npm `latest`。
