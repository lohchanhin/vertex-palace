# Round 8 条件仓库修复公开协议（0.4 Alpha）

## 状态与证据链

本协议在首次 Round 8 结果保存之后预注册，也早于再次对任何入选任务执行 Palace
操作。

原始 create-only 结果不可修改：

- 路径：
  `docs/research/evidence/held-out-confidence-calibration-0.4-alpha-round-8.json`
- 提交：`ea3504b770b26bae1ceeb684efe835ad72b0c66e`
- SHA-256：
  `F8779C649DCA4350B4E22FBF3E423047371F74F03F6EFB6E3356C2B81083B733`
- 状态：`invalid`
- 正式试验：基线 0，候选 0

16 个条件全部在本地条件仓库 setup 阶段失败，早于 `init`、`index`、`evaluate`
或 `context`。入选仓库曾被物化以核对 Git oracle，但两个受测 Palace 版本都没有
收到入选任务。候选产品保持不变，也没有用这些任务训练。尽管如此，本轮仍明确
标为公开的 harness 修复，不能替换或改写原始无效结果。

## 根因

原验证器从浅层源仓库使用 `git clone --shared` 建立隔离条件；源仓库当时检出的
`HEAD` 是路线 parent。入选 ground-truth 子提交虽然存在于源对象库，但没有被
复制的分支引用，因此条件 clone 无法解析 `<groundTruthCommit>^`。Git oracle
核对在任何 Palace 命令前停止。

这是通用 Git 物化缺陷；两个产品以完全相同方式失败，所以无效结果没有路线或
校准证据。

## 冻结修复

只有条件仓库物化方式改变：

1. 已验证的源仓库为路线与 ground-truth 提交建立私有 refs。
2. 每个条件仍得到物理独立的本地仓库。
3. 条件仓库用 `git init` 初始化，把已验证源仓库加入本地 remote，并以 depth 2
   fetch 两个私有 refs。
4. 条件仓库检出路线提交，并在任何 Palace 命令前重新核对完整 Git oracle。

合成两提交仓库测试必须证明：隔离条件可以解析 ground-truth parent 与精确修改
文件 oracle。

产品源码、CLI 产物、入选任务、条件顺序、重复次数、oracle、重试政策、上下文
预算、路线限制、drawer 限制、校准容差、指标、门槛和结论规则都不能改变。基线
与候选仍为：

| 角色 | 产品提交 | CLI SHA-256 |
| --- | --- | --- |
| 基线 | `228c3bde47f6930023496fdd0a54d43dba10091f` | `E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F` |
| 候选 | `1a02d89269acb36473db3ad39badab9fe338a4a3` | `49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747` |

成对执行仍为 4 个 AB 与 4 个 BA 目标，每目标、每条件重复两次；每条件 16 条，
总计 32 条。全部顺序执行，禁止并发。校准容差仍为 `0.15`，路线预算仍为 9 个
文件，上下文预算仍为 6,000 estimated tokens。

## 声明边界

修复后运行是候选未见静态比较的公开续测，不是新的“第一次未见观察”。由于产品
在 harness 修正前没有见到这些任务，它仍可测量置信度修复能否在冻结任务上
泛化。不过它仍不执行目标测试或 Agent，因此不能证明 Agent 正确率、reported
Token、工具调用或总耗时改善。

环境/setup、harness 与产品失败继续分开。负面或无差异产品结果也是有效证据，
不能被剔除成环境失败。

## 证据保存

修复验证器只写一个独立命名的 create-only 结果：

`docs/research/evidence/disclosed-round-8-after-condition-repository-repair-0.4-alpha.json`

结果会在测量前后嵌入并核对原始无效证据的哈希，不能覆盖原 Round 8 文件。

## 命令

本协议、简体中文版本、修复验证器与契约测试全部提交，而且 tracked worktree
干净后才能运行：

```powershell
node scripts/verify-disclosed-round-8-after-condition-repository-repair.cjs --out docs/research/evidence/disclosed-round-8-after-condition-repository-repair-0.4-alpha.json
```
