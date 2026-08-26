# 第 11 轮披露后 Owner Closure 修复结果（0.4 Alpha）

状态：披露后的事后回归；Attempt 7 首次通过冻结的披露回归门槛。

## 声明边界

正式、对 candidate 保持 held-out 的第 11 轮结果仍然是**失败**，且不可改写。
本报告所有 attempt 都发生在目标与失败已经被观察之后，只能证明通用修复对已披露
目标的兼容性，不能证明 held-out 泛化，也不能证明 Agent 正确率、回报 Token、工具
调用数或执行时间改善。

## 最终结果

Attempt 7 首次满足第 11 轮全部披露回归门槛：

- 8/8 目标通过，8/8 implementation/test 核心面完整。
- Target-macro changed-file coverage：`1.000`。
- Target-macro route focus：`0.701`，超过冻结门槛 `0.700`。
- Target-macro core route focus：`0.670`。
- 最低单目标 coverage：`1.000`；最低 focus：`0.500`。
- Overconfident、unsafe narrow、unsafe enforced-stop、指标不一致、
  evaluate/context 路线不一致、目标 tracked 文件变化全部为 0。
- 最大静态交付 context 估算 `3,802` Tokens，低于 `6,000` 上限。

## 修复链

| 观察 | 通过 | Core 完整 | Macro coverage | Macro focus | Core focus | Overconfident | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 正式冻结 candidate | 5/8 | 5/8 | 0.802 | 0.479 | 未单列 | 4 | FAILED |
| Attempt 1 | 5/8 | 5/8 | 0.885 | 0.504 | 0.483 | 2 | FAILED |
| Attempt 2 | 7/8 | 7/8 | 0.938 | 0.546 | 0.525 | 0 | FAILED |
| Attempt 3 | 8/8 | 8/8 | 1.000 | 0.567 | 0.546 | 0 | FAILED |
| Attempt 4 | 8/8 | 8/8 | 1.000 | 0.661 | 0.636 | 0 | FAILED |
| Attempt 5 | 7/8 | 7/8 | 0.938 | 0.616 | 0.591 | 2 | FAILED |
| Attempt 6 | 8/8 | 8/8 | 1.000 | 0.657 | 0.632 | 0 | FAILED |
| Attempt 7 | 8/8 | 8/8 | 1.000 | 0.701 | 0.670 | 0 | **PASSED** |

Attempt 5 被永久保留。pgx 中次要的 `ArrayCodec` owner 曾把正确的 `LoadTypes`
测试挤掉，证明早先一次 8/8 并不足够。当前规则会先保护任务开头明确代码主体的
验证；Attempt 6 恢复 recall，Attempt 7 再移除两类通用噪声。

## 通用产品规则

当前修复没有仓库名或目标名分支，增加的是：

1. 为已选中的任务实现闭合 owner-local test。
2. `LoadTypes` 这类任务开头的代码主体优先于句子后面的次要对象。
3. `validate.URL` 这类显式点号标识优先其 owner 模块；间接消费者仍可保留，
   但消费者的重复测试不会挤掉直接 owner test。
4. 当且仅当两个竞争实现都有独立 owner 证据时，允许有界双 owner 闭包。
5. 为 `base.py` 等泛用文件名加入 symbol-family 归属，并按路径层级衰减，避免嵌套
   同名测试压过精确 owner test。
6. 只有实现文件名过于泛用或任务明确要求文档时，才自动补 task-owner 文档；已经
   完整的 public API 路线不会仅因预算尚有空间而塞入同名指南。

## Attempt 7 各目标

| 目标 | 路线文件 | Coverage | Focus | 主要观察 |
| --- | ---: | ---: | ---: | --- |
| yup | 4 | 1.000 | 0.500 | Lazy 实现/测试外保留两个 runtime 邻居。 |
| marshmallow | 4 | 1.000 | 0.750 | 保留直接 validator test，移除重复 field test。 |
| arrayvec | 8 | 1.000 | 0.500 | 完整，但仍是最宽的披露路线。 |
| node-fetch | 4 | 1.000 | 1.000 | runtime、声明、类型测试、公开 runtime test 全部精确。 |
| jsonschema | 3 | 1.000 | 0.667 | 完整 oracle 加一个相关 format test。 |
| go-sql-driver-mysql | 7 | 1.000 | 0.857 | 六个因果文件加一个 supporting field 模块。 |
| itertools | 3 | 1.000 | 0.667 | 实现、聚焦测试与有界 changelog。 |
| pgx | 3 | 1.000 | 0.667 | `LoadTypes` owner/test 加必要 codec 实现。 |

## 证据完整性

- 正式 Round 11 SHA-256：
  `570C2AAA0F5A593466F4EAB5161897DADE310EB211ABE1F2647586B872797720`
- 历史披露后 Attempt 3 SHA-256：
  `939741A55D47839D970D261F3D4E91BBAF1B190272FFE336150131A64EBD3A2E`
- 披露后 Attempt 7 SHA-256：
  `065E6A331533C3A75BF65A96691C3040BB86385A7A4A2DB63DC003231DCEC7B5`
- 正式结果和所有 attempt 都是 create-only 证据文件。
- Attempt 7 期间所有目标仓库保持 tracked worktree clean。

证据文件：

- [正式 Round 11 结果](../research/evidence/local-blind-routing-validation-0.4-alpha-round-11-attempt-1.json)
- [披露后 Attempt 7](../research/evidence/disclosed-routing-round-11-after-owner-closure-repair-attempt-7-0.4-alpha.json)

## 决策

第 11 轮披露回归门槛已经通过，但它不是新鲜证据。它的价值是工程兼容性：通用
修复找回全部已知 owner closure，并在不削弱安全性的前提下越过冻结 focus 门槛。
泛化能力仍必须由递归不重叠、预注册的新一轮决定。
