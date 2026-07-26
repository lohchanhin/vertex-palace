# Round 8 SQLAlchemy 超时补测公开协议（0.4 Alpha）

## 状态与证据链

本协议在两份早期 Round 8 输出均已保存之后预注册，并且早于对 SQLAlchemy
执行任何新的 Palace 操作。

第一份 create-only 结果保持不可修改：

- 路径：`docs/research/evidence/held-out-confidence-calibration-0.4-alpha-round-8.json`
- 提交：`ea3504b770b26bae1ceeb684efe835ad72b0c66e`
- SHA-256：`F8779C649DCA4350B4E22FBF3E423047371F74F03F6EFB6E3356C2B81083B733`
- 状态：`invalid`；基线 0 条、候选 0 条正式试验

条件仓库修复后的公开结果也保持不可修改：

- 路径：`docs/research/evidence/disclosed-round-8-after-condition-repository-repair-0.4-alpha.json`
- 提交：`9eb29b4cdb639ccbb8db11df070fedb6498c49e6`
- SHA-256：`E6216E3F6F43BFC3CD42A2B5E640777349B1977250BB43A159AC5155FFF3A23D`
- 状态：`invalid`；七个成对目标中，基线 14 条、候选 14 条正式试验已完成

第二份结果已完成 yargs、zap、sinon、rich、viper、crossbeam 与 http 的两次
重复。SQLAlchemy 是唯一缺失目标。候选与基线索引都分别用尽两次约 300 秒的
尝试并以 `ETIMEDOUT` 结束，`evaluate` 与 `context` 尚未收到该任务。本次补测
不得重跑任何已经完成的目标。

## 冻结的环境补测

只有 SQLAlchemy 的显式索引执行策略改变：

1. 只运行 SQLAlchemy，并保留它在原始 manifest 中的索引 1。
2. 保留原成对顺序：先候选，再基线。
3. 每个条件使用独立的新仓库与新的 `.palace`。
4. 将两次 300 秒索引尝试改成每个条件一次 900 秒索引尝试。此举只提高上限，
   不允许看到结果后再追加重试。
5. 每个条件仍执行两次确定性 `evaluate` 与 `context`，每个条件两条，总计四条。
6. 全部顺序执行，禁止并发。

产品源码、CLI 产物、入选任务、Git oracle、路线限制、drawer 限制、上下文预算、
校准容差、指标、产品门槛与结论规则均不改变。冻结产品仍为：

| 角色 | 产品提交 | CLI SHA-256 |
| --- | --- | --- |
| 基线 | `228c3bde47f6930023496fdd0a54d43dba10091f` | `E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F` |
| 候选 | `1a02d89269acb36473db3ad39badab9fe338a4a3` | `49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747` |

校准容差保持 `0.15`，路线限制保持 9 个文件，上下文上限保持 6,000 estimated
tokens。

## 分析规则

本输出只是补充证据，不能替代前两份结果。如果两个条件都完成，就把本次第一次
确定性重复与先前七个已完成目标对合并，形成冻结的八目标描述性比较。如果任一条件
仍因环境或 harness 原因失败，八目标比较继续保持不完整。负面的产品结果仍是证据，
不得改归类为环境失败。

## 声明边界

这是公开披露的环境补测，不是新的首次观察，也不是重新选择未见目标。它只衡量静态
路线成员、coverage、focus、置信度校准、模式选择与已交付上下文大小。它不执行目标
测试或 Agent，因此不能支持 Agent 正确率、reported Token、工具调用或总耗时改善声明。

## 证据保存

验证器只写一个独立命名的 create-only 输出：

`docs/research/evidence/disclosed-round-8-sqlalchemy-timeout-completion-0.4-alpha.json`

它会在测量前后验证两份既有输出的哈希，并使用排他创建；不能覆盖任何早期 Round 8
结果。

## 命令

只有本协议、简体中文版、验证器与契约测试均已提交，而且 tracked worktree 干净后，
才能运行：

```powershell
node scripts/verify-disclosed-round-8-sqlalchemy-timeout-completion.cjs --out docs/research/evidence/disclosed-round-8-sqlalchemy-timeout-completion-0.4-alpha.json
```
