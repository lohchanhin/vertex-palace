# Held-out 跨仓库路由结果（0.4 Alpha，第三轮）

## 决定

**失败。候选版本 `6060e0c` 暂时不能进入 Agent A/B。**

第三轮机械选择了八个目标，在 JavaScript/TypeScript、Python、Go 与 Rust 之间保持平衡。第一次观察只有 Koa 完成，其他七个目标因 GitHub 传输与 DNS 失败而被删失。之后使用独立预注册的 recovery study，在产品候选版本完全不变的情况下补齐十四次缺失 trial。

原始研究继续保持 failed。Recovery 证据只是补齐诊断资料，不会追溯把第一次输出改成通过。

## 冻结证据

| 证据 | Commit | SHA-256 |
| --- | --- | --- |
| Target manifest | `d35ff81` | `16D62D36341E22864DED89CB7A8C2CC6C5D765C0C4F8B6AE237CFC4D5F0E1DC2` |
| 原始观察 | `2964abf` | `7C1C0731008979D1DD3085EAEC86A43F277E3BFE588C86D43D5E11AFA5BD7EDF` |
| 环境恢复观察 | `30229a1` | `E400C7C8AF72B10A18FAA51AED643EEEBC6F7A6DBF033C821C822A2E50719499` |

- 产品候选版本：`6060e0c6aa2aea64d0145c1e55bccdc4669e4b48`
- 原始 harness：`2cfc712bfa100277635f13e970ded9d05cf120e2`
- Recovery harness：`86823556585c2dbfabe3c1c3a8c9bf4ac1bb04e9`
- Manifest 与原始 harness 冻结前针对候选任务的 Palace 调用：`0`
- 原始观察与 recovery 观察之间的产品改动：`0`

第一次 selector 进程在生成 manifest 前被中断。这个非结果已经独立保存，并且没有改变已提交 selector、仓库池或任务集合。

## 环境恢复

原始观察包含一个有效产品结果与七个环境删失目标：

- Koa 完成两次 trial。
- Starlette 在 Git 传输时连接被重置。
- 另外六个目标在 Palace 执行前发生 DNS 解析失败。

Recovery 协议只允许在 Palace 执行前最多进行三次 materialization attempt。七个目标都在 recovery 的第一次 attempt 成功，没有剩余 environment、setup 或 harness failure。这证明原始缺失观察主要是基础设施问题，而不是七个 Palace 同时失败。

## 合并描述结果

下面的计算将 Koa 两次不可变的原始 trial 与十四次 recovery trial 合并。它只是完整数据集的描述性统计，不会替代原始协议状态。

| 指标 | 结果 | 门槛 |
| --- | ---: | ---: |
| 通过目标 | 4/8 | 8/8 |
| 完成 trials | 16/16 | 16/16 |
| Task type 正确目标 | 7/8 | 8/8 |
| Core 实现/测试完整目标 | 5/8 | 8/8 |
| Macro changed-file coverage | 0.750 | >= 0.900 |
| Macro route focus | 0.538 | >= 0.750 |
| Macro route precision | 0.538 | >= 0.750 |
| 最低目标 focus / precision | 0.000 / 0.000 | >= 0.500 / 0.500 |
| Overconfident trials | 6 | 0 |
| 确定性目标 | 8/8 | 8/8 |
| Clean tracked worktree | 8/8 | 8/8 |
| 最大 context | 5,650 | <= 6,000 |

候选版本只通过完成度、确定性、worktree 清洁度与 context 上限，其他质量门槛全部失败。

## 各目标结果

| 目标 | 结果 | Coverage | Focus | Precision | 主要观察 |
| --- | --- | ---: | ---: | ---: | --- |
| Koa | 失败 | 0.00 | 0.00 | 0.00 | 选择 request 侧实现与旧的 response type 测试，两个 oracle 文件都没命中。 |
| Starlette | 失败 | 0.50 | 0.33 | 0.33 | 找到 `requests.py`，但选择 response 侧测试并漏掉 `tests/test_requests.py`。 |
| Gin | 通过 | 1.00 | 1.00 | 1.00 | 精确实现与测试配对。 |
| Tower | 失败 | 0.50 | 0.25 | 0.25 | 找到 `service.rs`，却漏掉同目录 `test.rs`，并加入三个宽泛 integration test。 |
| Axios | 通过 | 1.00 | 1.00 | 1.00 | 精确实现与测试配对。 |
| Echo | 通过 | 1.00 | 1.00 | 1.00 | 精确实现与测试配对。 |
| serde_json | 通过 | 1.00 | 0.50 | 0.50 | 命中两个 oracle 文件，但多加入两个相关文件。 |
| Pydantic | 失败 | 1.00 | 0.22 | 0.22 | 命中两个 oracle 文件，但任务被分类为 unknown，并以 legacy 与无关 `allow` 匹配填满九个名额。 |

所有目标的两次路线都完全一致，但“稳定地选错”仍然是失败。

## 已经泛化的部分

1. Gin、Axios 与 Echo 的直接实现/测试配对表现良好。
2. serde_json 与 Pydantic 都保持完整 core coverage，只是 focus 差异很大。
3. 十六次完成 trial 都遵守 6,000-token context 上限。
4. Palace 没有修改任何目标仓库的 tracked 文件。
5. 之前的重名模块消歧与精确配对机制确实转移到部分未见语言和目录结构。

## 没有泛化的部分

### Request 与 Response 语义

Koa 和 Starlette 暴露了方向语义不足。response、content type、headers 与 request 等共享词足以选到邻近但行为错误的表面。路由需要更重视明确 receiver、结果描述与测试行为。

### 同目录测试拓扑

Tower 的聚焦测试位于实现旁边的 `src/.../test.rs`，路由却偏好 `tower/tests/...` 的宽泛 integration test。应先使用实现与同目录 module test 的关系，再考虑通用测试目录。

### Feature 分类

`Allow periods in unquoted NameEmail display names` 被分类为 `unknown`，但 selector 已在路由前机械冻结它为 `feature`。Allow、Support、Add、Implement 等祈使 feature 动词需要有边界的明确分类。

### Route Limit 仍然被当成配额

Pydantic 刚好返回九个文件。它先找到两个 oracle，又继续加入 legacy v1 module、无关测试与 `allow_partial` 测试。这证明 evidence-sufficient stopping 尚未一致覆盖 feature 与 unknown 任务。

### Confidence 校准

Koa、Starlette 与 Tower 在 coverage 为 0.00 或 0.50 时仍产生六次 overconfident trial。Confidence 仍过度相信局部词汇强度，没有充分惩罚实现/测试关系缺失。

## 研发方向

下一候选版本只能采用通用机制：

1. 有边界地识别祈使 feature 动词，同时不能把 `allow` 等通用动词当成强文件身份。
2. 提取并优先使用 `Request.cookies`、`NameEmail` 与 scoped commit concept 等明确代码身份。
3. 结合 receiver、结果描述与测试标题，区分 request 侧和 response 侧行为。
4. 当同目录 module test 与实现关系更强时，优先于宽泛 integration test。
5. 对所有 task type 使用 evidence-sufficient stopping；route limit 永远只是上限，不是配额。
6. 如果已选测试与主要实现缺乏强关系，或 core surface 仍有歧义，就必须压低 confidence。

Koa、Starlette、Tower 与 Pydantic 现在都是已公开开发数据。Gin、Axios、Echo 与 serde_json 也已经属于第三轮观察池，修复后不能再次作为 held-out 证据。

## 声明边界

第三轮只是静态路由证据。它比更早的未见样本 `0/6` 有真实进展，但不能证明 Agent 正确率、Token 节省、wall time 降低或工具调用减少。

完成通用修复和已见回归后，仍需要另一批 untouched pool 才能进入 Agent A/B。本结果不授权发布或性能声明。
