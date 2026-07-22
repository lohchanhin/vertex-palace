# 0.4 Alpha 跨仓库路由精度结果

状态：首次记录运行通过全部预注册复制门槛。

## 冻结证据

- 产品候选：`b6ff88fc126800a799973447f5ce6b37b925a6a3`。
- 预注册协议与执行器：`119f9bd8e899a040fcebe9237aba97bf3288166e`。
- 首次观察证据提交：`b9194e317590b799e3f826a1a0138735297d97a3`。
- 证据文件：`docs/research/evidence/cross-repository-route-precision-0.4-alpha.json`。
- 证据 SHA-256：`3DEBDFCAC40D6532954D79C7F33EE947C80B63EA7C2AD1815CF3E6604D19A85C`。

执行器使用仅限新建的证据写入。协议、仓库集合、任务、commit、Oracle 文件、可接受边界、预算与门槛都在观察结果之前完成提交。

## 实验结果

| 仓库 | 路线文件数 | Coverage | Route focus | 可接受边界精度 | Confidence | 校准 | 最大 Context tokens |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| Zod | 2 | 1.00 | 1.00 | 1.00 | 0.87 | 校准良好 | 2,277 |
| Requests | 2 | 1.00 | 1.00 | 1.00 | 0.72 | 偏保守 | 1,958 |
| p-limit | 3 | 1.00 | 0.67 | 1.00 | 0.55 | 偏保守 | 2,159 |
| **宏平均 / 最大值** | - | **1.00** | **0.89** | **1.00** | - | **0 次过度自信** | **2,277** |

三个仓库全部通过，六个预注册 trial 全部完成。每个仓库的冷、暖 evaluation 都返回完全相同的路线文件集合。Selected 与 excluded 边界没有重叠，目标仓库没有任何 tracked file 被修改，所有 Context payload 都低于 6,000-token 上限。

p-limit 路线包含两个实际改动文件，以及预注册允许的类型测试配置 `package.json`。因此 changed-file focus 为 `2 / 3 = 0.67`，可接受边界精度仍为 `3 / 3 = 1.00`。

## Oracle 隔离

Changed-file Oracle 没有参与路线规划。`evaluateRoute` 会先建立或读取路线，之后才正规化并比较 `changedFiles`，计算 coverage、focus 与 calibration。独立的自适应 context 调用只收到任务文字和冻结的预算控制。

## 结果后的自我审计

这项审计不属于预注册复制结果，也不会改变原结果。它检查 Palace 能否为这次研究自己产生的六个文件规划路线：执行器、双语协议、JSON 证据与双语结果。

| 任务写法 | Evaluation | Coverage | Route focus | Confidence | 校准 |
| --- | --- | ---: | ---: | ---: | --- |
| 中文 | `evaluation_aed0f811252f98e3` | 0.00 | 0.00 | 0.81 | 过度自信 |
| 等价英文 | `evaluation_52f0a0280b0cd1c1` | 0.00 | 0.00 | 0.72 | 过度自信 |
| 显式重建索引后的英文 | `evaluation_104e35f60fed62a0` | 0.00 | 0.00 | 0.72 | 过度自信 |

索引中实际存在全部六个路径，但路线根据零散关键词选中了通用 router 代码与旧研究文档。因此失败并非只来自中文解析，也不是文件没有进入索引。

审计同时发现：执行 `palace index` 后，`palace status` 仍会立即显示 `stale: true`。当前 indexer 会在普通扫描后追加已声明的生成物，而 status 只使用普通扫描与已存 hash 比较。`dist/palace.cjs` 这类被忽略的生成输出会造成永久的数量差异，让自托管仓库反复索引。

这些失败不会推翻三个仓库的正式通过结果：任务、仓库与门槛仍由首次证据冻结。但它们会阻止当前候选直接进入 held-out 测试。

## 这次结果证明了什么

0.4 Alpha 的角色优先路由候选，在这组复制目标的 TypeScript、Python、JavaScript／类型声明仓库上保持完整目标文件召回。路线被限制在精确的可接受边界内，冷暖 evaluation 结果一致，也没有出现过度自信。

这说明聚焦路由的改进并非只在 Vertex Palace 自己的仓库内有效，并且已经通过预注册的跨仓库回归门槛。

## 这次结果没有证明什么

- 这些仓库曾出现在旧版研究中，因此属于复制，不是 held-out 泛化。
- 三个仓库、两次确定性重复不足以估计整个开源生态的表现。
- 实验没有让 Agent 修改代码、执行目标测试或真正解决任务。
- 没有 Control 组，因此执行时间和 payload 大小不能证明 Agent 更快或实际 Token 更少。
- Context 调用位于 evaluation 之后，使用的是已经刷新的暖索引；时间字段只能用于诊断。
- Requests 与 p-limit 的 confidence 仍然偏保守，必须累积更多未见样本后才能调整校准。

## 决策

保持冻结候选与首次观察证据不变。以公开披露的失败自我审计作为开发资料，建立一个修复生成物新鲜度一致性与复合文件家族选择的新候选。新候选必须继续通过原本的 Zod、Requests、p-limit 门槛，并通过六文件自我审计，才允许晋级。

完成回归后，再从一个未曾出现在 Vertex Palace 实现、测试、协议与既有证据中的仓库预注册真实历史任务。只执行一次 held-out 静态验证并保存首次结果；通过后才进入随机化的 Control、Adaptive 与 Full Palace Agent 实验。
