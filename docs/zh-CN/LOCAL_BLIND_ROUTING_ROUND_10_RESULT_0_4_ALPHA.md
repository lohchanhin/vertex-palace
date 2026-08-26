# 本地盲测路由第 10 轮结果（0.4 Alpha）

## 结论

Round 10 是一轮有效、完整、对候选保持 held-out 的成对静态路由研究。8 个目标与
32 次正式观察全部完成；环境/设定失败为 0、harness contract 失败为 0、过期索引
为 0、selected/excluded 边界重叠为 0，也没有修改目标仓库的 tracked 文件。

候选相对冻结基线改善了证据覆盖、路由焦点、置信度校准与模式安全，但**没有通过
预先冻结的绝对门槛**，因此不能进入端到端 Agent A/B 协议。本结果不能被描述成
已经证明 Agent 正确率、reported Token 节省、Agent 工具调用减少或 Agent 执行
时间下降。

## 证据完整性

- 正式结果 SHA-256：
  `C5D90E362119C558744836820DC47FB5C8869EE565CCC17E619E5298F03B3CB2`
- 验证冻结清单 SHA-256：
  `3F95975A22796FCD9BD38C10EED3AE93BB885314A7FC878F5616FBFC8F885275`
- 目标 manifest SHA-256：
  `2E2D8BFA6867FADDF21916F80F161BCA9BFF6F4DD589BBDF4C15B2FD34067F06`
- 候选冻结清单 SHA-256：
  `F1E7EFE6D15BC279970BD7E9171E930C649941F2B272FA4394F33CC0ED48F984`

正式结果是 create-only 文件，之后保持不变。从现在起，这 8 个任务都属于 disclosed
regression cases，不能再作为 held-out 泛化证据。

## 汇总比较

| 指标 | 基线 | 候选 | 差值 |
| --- | ---: | ---: | ---: |
| 通过目标 | 3/8 | 4/8 | +1 |
| 核心证据完整 | 4/8 | 5/8 | +1 |
| 精确命中全部 oracle | 3/8 | 3/8 | 0 |
| 辅助证据完整 | 0/2 | 0/2 | 0 |
| 宏平均 changed-file coverage | 0.654 | 0.804 | +0.150 |
| 宏平均 route focus | 0.729 | 0.810 | +0.081 |
| 最差目标 coverage | 0.000 | 0.500 | +0.500 |
| 最差目标 focus | 0.000 | 0.333 | +0.333 |
| 置信度平均绝对误差 | 0.338 | 0.177 | -0.161 |
| 过度自信 trials | 8 | 0 | -8 |
| 不安全窄模式 trials | 6 | 0 | -6 |
| 覆盖不足却强制停止 trials | 2 | 0 | -2 |
| 平均 context estimated Tokens | 1,931.875 | 2,815.500 | +883.625 |
| 静态命令总时间 | 52.692 秒 | 61.307 秒 | +8.615 秒 |

候选在成对 coverage、focus、窄模式安全与停止安全方面都没有劣于基线。但绝对门槛
仍然失败：宏平均 coverage 未达到 0.90、一个目标 focus 低于 0.40、核心与辅助
证据仍有遗漏，而且 6 次 trial 暴露了路由指标精度不一致。

## 各目标发现

| 目标 | 候选结果 | 主要观察 |
| --- | --- | --- |
| p-map | 通过 | 找回精确实现与聚焦测试，coverage 与 focus 都达到 1.0。 |
| itsdangerous | 失败 | coverage 从 0.4 提升至 0.6，但遗漏 `timed.py` 与 `tox.ini`。 |
| gorilla-websocket | 通过 | coverage 保持 1.0，但从 2 个文件扩张到 5 个，focus 从 1.0 降至 0.4。 |
| syn | 失败 | 找到正确测试，却遗漏 `codegen` workspace 的实现，focus 为 0.333。 |
| uuid | 失败 | 找到直接 v1 测试，但没有跟到受行为影响的 v6 测试。 |
| markupsafe | 失败 | 核心实现与测试完整，但遗漏 changelog 辅助证据。 |
| logrus | 通过 | 精确实现/测试配对保持稳定。 |
| slab | 通过 | 精确实现/测试配对保持稳定。 |

## 通用失败类别

1. **Workspace 与生成代码归属。** `syn` 任务明确提到 generated code，但路由停在
   root crate，没有锚定 `codegen` workspace package。
2. **有限的传递测试影响。** `uuid` 已命中实现，却没有沿 v1 到 v6 的行为依赖找到
   第二个聚焦测试。
3. **因果实现兄弟文件。** `itsdangerous` 找到 serializer 与测试，却没有找到相关
   timed serializer 实现。
4. **辅助证据策略。** changelog 与验证配置文件的召回不稳定；它们需要按角色显式
   评分与分配预算，不能继续作为普通词汇文件竞争。
5. **召回扩张缺少饱和停止。** 安全扩张修复了遗漏并消除了不安全窄模式，但
   `gorilla-websocket` 证明实现与聚焦测试已经完整后，还需要更强的停止条件。
6. **指标精度契约。** `evaluate` 把比例四舍五入到两位小数，冻结 validator 则独立
   保留三位小数，并要求误差不超过 0.001；循环小数因此产生 6 次 disagreement。
   这是测量契约缺陷，不代表路线不确定，但仍必须保留为正式门槛失败。

## 后续研发方向

下一轮产品研发应针对这些通用类别：加入 workspace/package ownership 与 generated
code 锚点；建立有限的传递测试影响边；按角色识别辅助证据；在实现与聚焦测试形成
独立闭环后停止扩张；并统一公开 evaluate 与独立测量的精度。

先用 Round 10 的 8 个 disclosed cases 做回归验证，再建立递归零重叠的新 Round 11
仓库池与任务。只有新的 held-out 绝对门槛通过，才允许进入 Agent A/B 研究。

