# 分层路由验证结果（0.4.0-alpha.2，Round 22）

## 结论

**失败。** 冻结的 alpha.2 candidate 通过引用补全、宏观 focus、确定性、Context 上限、Git 隔离与 payload 一致性门槛；但控制任务拒答、核心闭合、宏观覆盖、单目标覆盖/focus、明确附属真值与置信度校准均失败。Round 22 不能让稳定 0.4 获得资格，并永久保留为 regression 证据。

原始结果：[layered-routing-results-round-22.json](../research/evidence/layered-routing-results-round-22.json)

## 汇总

| 指标 | 结果 | 门槛 |
| --- | ---: | ---: |
| 可访问引用补全 | 6/6 runs | 100%，通过 |
| 控制任务正确拒答 | 4/6 runs | 100%，失败 |
| 可路由任务核心闭合 | 0/18 runs | 100%，失败 |
| 宏观核心覆盖率 | 0.444 | >= 0.90，失败 |
| 宏观 route focus | 0.889 | >= 0.70，通过 |
| Candidate 平均交付 Context | 1,766.167 tokens | 仅描述 |
| Baseline 平均交付 Context | 786.250 tokens | 仅描述 |

这里的 Context 是静态交付 payload，不是 Agent 总 Token，也不是性能证据。

## Candidate 目标表现

| 目标 | 分层 | 核心 | Focus | 明确附属 | 结果 |
| --- | --- | ---: | ---: | ---: | --- |
| TS ledger | local | 0.50 | 1.00 | 1.00 | 漏 focused test |
| Python invoice | local | 0.50 | 1.00 | 1.00 | 漏 focused test |
| Go identity | local | 0.50 | 1.00 | 1.00 | 漏 focused test |
| Rust frame | reference | 0.50 | 1.00 | 1.00 | metadata 成功，漏 test |
| TS session | reference | 0.50 | 1.00 | 1.00 | metadata 成功，漏 test |
| Python retry window | reference | 0.50 | 1.00 | 1.00 | metadata 成功，漏 test |
| Go quota | high connectivity | 0.50 | 1.00 | 1.00 | 找到 contract，漏 test |
| Rust cursor | high connectivity | 0.00 | 0.00 | 0.00 | 高连接 registry 排挤明确证据 |
| TS checkout | high connectivity | 0.50 | 1.00 | 0.00 | 漏 test 与 contract |
| Rust opaque control | control | 1.00 | 0.00 | 1.00 | 正确拒答 |
| Python incident control | control | 1.00 | 0.00 | 1.00 | 裸 incident 数字被误判为本地证据 |
| Go opaque PR control | control | 1.00 | 0.00 | 1.00 | 正确拒答 |

所有 candidate 目标的两次重复路线都完全一致。

## 根因

共同根因不是缺少仓库名称规则，而是明确任务事实仍只是排序加分项，没有成为硬证据约束。即使任务明确写出 focused test，增益扩张仍可能在一个实现文件后停止；高连接候选也可能排挤任务明确点名的 implementation、test 与 contract。Grounding 阶段则把裸 incident 数字错误当成代码标识。

## 原样保留的分析器缺陷

原始 `zeroWrongForcedStops` 显示通过，是因为冻结 runner 只检查 `evidenceStatus`，没有对照 oracle 完整度。有些 local 路线只覆盖 2 个核心文件中的 1 个却强制停止，因此保守解释是这项安全性没有被证明。两个非劣门槛也因 candidate 与 baseline 共同完成目标为 0 而空泛通过。原始数值均不改写。

## 允许的下一步

稳定资格归零，最多允许一次通用机制修复。修复方向是先建立“明确任务事实必须闭合”的证据契约，再执行增益排序：点名的 implementation、focused test 与 contract 必须命中，否则保持 advisory；裸数字 incident 不能建立本地 grounding。Round 22 从此只作为 regression。Round 23 已经绑定失败 candidate，不能替修复后的 candidate 取得稳定资格；未来 candidate 必须使用全新未观察目标。
