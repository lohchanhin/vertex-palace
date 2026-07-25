# 跨仓库未见路由验证结果（0.4 Alpha，Round 7）

## 结论

**失败。** 冻结候选没有达到 Round 7 预注册的静态路由门槛。

原始证据：
`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-7.json`

证据 SHA-256：
`C53C9186853F1661158212604804261C8394781454A7C7B7DF15811D4E42D7B9`

## 汇总结果

| 指标 | 结果 | 门槛 |
| --- | ---: | ---: |
| 通过目标 | 2 / 8 | 8 / 8 |
| 完成 trial | 16 / 16 | 16 / 16 |
| 确定性目标 | 8 / 8 | 8 / 8 |
| 任务类型匹配 | 6 / 8 | 8 / 8 |
| 核心表面完整 | 3 / 8 | 8 / 8 |
| 辅助表面完整 | 0 / 2 | 2 / 2 |
| 精确 oracle | 2 / 8 | 描述指标 |
| Macro changed-file coverage | 0.557 | >= 0.90 |
| Macro route focus | 0.480 | >= 0.75 |
| Macro route precision | 0.481 | >= 0.75 |
| 最低单目标 focus | 0.000 | >= 0.50 |
| 最低单目标 precision | 0.000 | >= 0.50 |
| Overconfident trial | 4 | 0 |
| 最大 context payload | 3,453 tokens | <= 6,000 |

环境、setup、harness-contract 失败全部为 0。每个目标都完成两次 trial，而且两次
路线完全相同。因此这是产品或路由合约问题，不是环境噪声。

## 各目标结果

| 目标 | 语言 | 状态 | 首次 coverage | Focus | 主要问题 |
| --- | --- | --- | ---: | ---: | --- |
| execa | JavaScript/TypeScript | 失败 | 0.00 | 0.00 | 语义锚点错误；`Fixes` 被分类为 unknown |
| jinja | Python | 失败 | 0.33 | 0.20 | 找到测试，漏掉实现与 changelog |
| go-multierror | Go | 通过 | 1.00 | 1.00 | 实现与测试精确命中 |
| thiserror | Rust | 失败 | 0.50 | 0.50 | 找到测试，漏掉实现；`Avoid` 被错分 feature |
| node-glob | JavaScript/TypeScript | 通过 | 1.00 | 1.00 | 实现与测试精确命中 |
| httpcore | Python | 失败 | 0.80 | 0.44 | 核心文件齐全，漏 changelog，并多带 5 个文件 |
| httprouter | Go | 失败 | 0.50 | 0.50 | 找到实现，却选择错误测试配对 |
| mio | Rust | 失败 | 0.33 | 0.20 | 选择平台 selector，而非 TCP stream 实现与测试 |

两个通过目标也是唯一两个精确 oracle。确定性不能挽救错误路线：失败目标只是把
同一个错误或不完整结果稳定重复了两次。

## 本结果证明了什么

1. Round 4 的 disclosed regression 成功没有泛化到这批未见 Round 7 样本。
2. 产品任务分类器与冻结研究分类器不一致：`Fixes ...` 变成 `unknown`，
   `Avoid ...` 被分成 `feature` 而不是 `bugfix`。
3. 词面相关性可能压过真实改动表面：Execa 被带到通用 escape/argument 文件，
   Mio 被带到 selector 内部实现。
4. 路径测试配对还不够可靠：Httprouter 选了 `router_test.go`，而不是直接对应的
   `tree_test.go`。
5. 间接实现路径仍弱：Jinja 与 Thiserror 找到聚焦测试，却漏掉测试真正覆盖的
   实现模块。
6. 本样本的文档/配置辅助面能力为 0：两个 changelog oracle 都漏掉。
7. Confidence 仍不够安全：4 个低或零 coverage trial 过度自信。

## 本结果不能证明什么

- 没有测量 Agent 实际实现正确率。
- 没有运行目标仓库测试。
- 不能证明 Token、工具调用或执行时间节省。
- 两次重复只检查确定性，不是独立样本。
- 仓库只对产品候选未见，不保证底层模型从未见过。

## 有证据支持的修复方向

Round 7 任务现在已经 disclosed。任何修复只能使用新名称的 disclosed regression，
不能改变这次 held-out 结果。

下一阶段产品研发顺序：

1. 让产品任务分类支持经过测试的动词原形与变化形式，包括 `Fixes`、`Avoid`、
   `Prevent` 家族。
2. 在加入通用邻近测试前，优先强化实现文件与直接同名测试的配对。
3. 高 confidence 必须有更强任务概念锚点与竞争锚点差距；零 coverage 路线不能
   继续给出 0.75 或 0.86。
4. 从聚焦测试或宏表面进行有上限的因果扩展，找到它实际覆盖的实现，同时避免
   恢复全仓扫描。
5. 显式建模 release-note/配置表面，并测量 focus 成本，而不是把所有文档塞入
   每条路线。
6. 八个 Round 7 任务只能作为 disclosed regression 重跑，保留原始证据哈希，
   同时报告召回提升与额外文件成本。
