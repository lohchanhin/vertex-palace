# Round 5 目标选择失败报告（0.4 Alpha）

## 结果

Round 5 没有形成有效的未见路由验证集。冻结选择器要求 8 个目标，实际只选到
7 个，并且只有三个语言家族满足配额：

| 语言家族 | 要求 | 实际 |
| --- | ---: | ---: |
| JavaScript/TypeScript | 2 | 2 |
| Python | 2 | 1 |
| Go | 2 | 2 |
| Rust | 2 | 2 |

因此 create-only manifest 如实记录 `status: selection-failed` 和
`languageDiversitySatisfied: false`。没有任何候选任务被交给 Vertex Palace。

原始 manifest：
`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-5.json`

Manifest SHA-256：
`73B12E699DA29F86F7AF31D6483549D15F94AE1353B14F566053AE8D7B7633D6`

## 这不是环境失败

所有被检查的仓库都在第一次尝试时成功物化，没有 clone、checkout、timeout
或 Git object 缺失。失败来自预注册的取样规则：

- `django`：检查 300 个提交，全部被
  `non-behavioral-or-ambiguous-subject` 拒绝。
- `trio`：检查到第 130 个提交时选中目标。
- `anyio`：没有合格提交；300 个提交中有 283 个在标题分类阶段被拒，其余由
  其他冻结条件拒绝。

Rust 的主仓库 `tokio` 也有 300 个标题全部被拒，但预注册 fallback
`tower-http` 补足了第二个 Rust 目标。Python 用完 fallback 后仍缺一个目标。

## 解读

这是**目标选择协议失败**，不是 Vertex Palace 路由失败，也不能作为产品表现的
正面或负面证据。产品候选一直冻结在
`f61207688badbe07818470a42441a3a966a8bdf0`，选择阶段调用 Palace 的次数为 0。

证据显示标题分类器对真实仓库过窄。它只识别 `Fix`、`Add` 等动词原形，没有
识别 `Fixed`、`Added` 等常见变化形式，导致许多本来可能适合作为真实历史任务
的提交，在检查文件与测试条件前就被排除。

## 声明边界

- 这 7 个目标不能拼成通过的 Round 5 结果。
- 失败 manifest 不会被覆盖，也不会人工补题。
- 看过仓库历史后，不允许临时更换仓库。
- Round 5 目标已经成为公开研究观察，下一轮全新池必须排除它们。
- 本结果不能支持 Token、时间、正确率或路由质量声明。

## 下一轮协议

新的独立轮次将：

1. 排除完整的 53 仓库边界：Round 5 已排除的 41 个仓库，加上 Round 5 池的
   全部 12 个仓库。
2. 在读取任何新仓库历史前，冻结新的四语言平衡仓库池。
3. 在选择前扩展机械标题分类器，支持 `Added`、`Fixed`、`Implemented`、
   `Resolved` 等常见变化形式。
4. 保持源码 diff、聚焦测试、文件数量、改动行数、create-only 输出与选择阶段
   Palace 调用为 0 等其他约束不变。
5. 如果再次失败，仍保存失败 manifest，不在选择开始后修改规则或仓库。
