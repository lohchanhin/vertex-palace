# Round 6 目标选择失败报告（0.4 Alpha）

## 结果

Round 6 仍没有形成有效的未见路由验证集。冻结选择器要求 8 个目标，实际再次只
选到 7 个：

| 语言家族 | 要求 | 实际 |
| --- | ---: | ---: |
| JavaScript/TypeScript | 2 | 2 |
| Python | 2 | 1 |
| Go | 2 | 2 |
| Rust | 2 | 2 |

create-only manifest 如实记录 `status: selection-failed` 和
`languageDiversitySatisfied: false`。没有任何候选任务被交给 Vertex Palace。

原始 manifest：
`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-6.json`

Manifest SHA-256：
`C02BAB99B8148C861EFA01D37EECA01C024340B10EA321A6A3A6DCB41B146726`

## 环境分类

这不是环境失败。所有被检查仓库都在第一次尝试时成功物化，没有 clone、
checkout、timeout 或 Git object 缺失。

冻结的 `inflected-behavioral-subject-v1` 改善了 Python 以外的取样：
JavaScript/TypeScript、Go、Rust 都由各自前两个仓库直接填满。Python 用完三个
仓库后仍不足：

- `werkzeug`：300 个提交都不合格，包括 264 个模糊标题、18 个含排除路径的
  diff、13 个文件数量不合格，以及 3 个缺少“实现 + 聚焦测试”的提交。
- `black`：300 个提交都不合格，包括 190 个模糊标题、45 个含排除路径的
  diff、42 个文件数量不合格、21 个含非修改状态文件，以及 2 个非源码扩展名。
- `attrs`：检查到第 36 个提交时选中。

## 解读

这仍是**目标选择协议失败**，不是 Vertex Palace 路由结果。产品候选一直冻结在
`f61207688badbe07818470a42441a3a966a8bdf0`，选择阶段 Palace 调用次数为 0。

动词变化分类器解决了 Round 5 取样问题的一部分，但现有协议仍要求每个改动文件
都是主要语言的源码扩展名；一旦提交同时修改文档、配置、changelog 或其他排除面，
整个提交就会被拒绝。这可能在正式路由前系统性排除真实的多表面任务。汇总拒绝
计数证明它是协议设计风险，但不能证明每个被拒提交本来都合格。

## 声明边界

- 这 7 个目标不能拼成通过的 Round 6 结果。
- 失败 manifest 不会被覆盖或人工补题。
- Round 6 任务与池内全部 12 个仓库都已成为公开研究观察，下一轮必须排除。
- 本结果不能支持 Token、时间、正确率或路由质量声明。
- 产品代码没有改变；后续只调整研究取样方法。

## 下一轮协议方向

新的独立预注册轮次将：

1. 使用全新仓库池和完整的先前排除边界。
2. 增加每个语言家族的预注册仓库数，降低单一生态提交惯例耗尽配额的风险。
3. 继续要求实现文件与聚焦测试，同时允许 oracle 中包含少量、有上限的已修改
   文档或配置文件。
4. 继续排除生成物、锁文件、vendor、fixture、snapshot、示例和 benchmark。
5. 在读取新历史前冻结任务分类、仓库顺序、表面限制和输出行为。
6. 如果再次失败，继续保存失败结果，不做原地修补。
