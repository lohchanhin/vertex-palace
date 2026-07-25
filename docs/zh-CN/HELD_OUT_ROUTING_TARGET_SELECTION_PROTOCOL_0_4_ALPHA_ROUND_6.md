# 未见路由目标选择协议（0.4 Alpha，Round 6）

## 状态

本协议在读取任何 Round 6 仓库历史、diff、提交标题或任务之前预注册，也早于
任何候选任务被交给 Vertex Palace。英文协议、简体中文协议、仓库池 JSON、
选择器、任务分类器及测试必须先提交，之后才能运行选择。

这是相对于产品候选的未见证据：Round 6 的仓库 URL 都没有进入过先前 Vertex
Palace 研发或研究池。但这不表示底层模型从未见过这些公开仓库。

## 冻结产品

- 产品候选：`f61207688badbe07818470a42441a3a966a8bdf0`
- CLI：`dist/palace.cjs`
- CLI SHA-256：
  `72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC`
- 冻结路径：`packages/` 与 `plugins/vertex-palace/mcp/server.cjs`

产品候选之后提交的研究文件不改变运行时代码。如果冻结路径或 CLI 哈希不同，
选择器会拒绝运行。

## 为什么开启新轮次

Round 5 已原样保存为 `selection-failed`：要求 8 个目标，实际只有 7 个；Python
只选到 1/2。所有仓库第一次物化都成功，但只识别动词原形的标题分类器拒绝了
Django 的全部 300 个标题，以及 AnyIO 的 283/300 个标题。

Round 6 只修改研究取样分类器，不修改 Vertex Palace。新的通用规则支持常见
动词原形和变化形式，并在读取 Round 6 历史前完成实现与测试。Round 5 目标不会
重复使用；如果 Round 6 失败，也会保存失败结果，而不是原地修改规则。

## 完整排除边界

排除集合共有 53 个仓库：Round 5 已排除的 41 个仓库，加上 Round 5 仓库池的
全部 12 个仓库，包括当时未检查的 fallback。预注册测试会从冻结 Round 5 池
机械推导这份并集，并要求它与 Round 6 `previouslyObservedRepositories` 完全一致。

组织或生态重叠不等于仓库独立。新池可以包含过去见过的组织旗下其他仓库，但
仓库 URL 不能重复；最终报告会继续声明这项限制。

## 数量与平衡

Round 6 要选择 8 个目标：JavaScript/TypeScript、Python、Go、Rust 各 2 个。
每个语言家族固定 3 个仓库，前两个有合格历史提交的仓库入选；两个名额填满后，
第三个 fallback 不再检查。

仓库顺序、语言、HEAD、资格规则、分类器和 fallback 行为都在读取 Round 6
仓库历史前冻结。

## 冻结仓库池

HEAD 只通过 `git ls-remote <url> HEAD` 获得。选择和排序时没有读取提交历史、
diff、标题、候选任务或 Palace 结果。

| 顺序 | 仓库 | 语言家族 | 角色 | 固定 HEAD |
| ---: | --- | --- | --- | --- |
| 1 | sindresorhus/ky | JavaScript/TypeScript | primary | `3419113b48e034fdcf8fa6bd3be3da7b3d0d758f` |
| 2 | pallets/werkzeug | Python | primary | `1b00618e787f40dfb21eba29caf8f8be7c8e1d93` |
| 3 | golang-jwt/jwt | Go | primary | `1a11d3724e63105d751decf9adbdc90165137b45` |
| 4 | dtolnay/anyhow | Rust | primary | `1dbe1862aae650423e3361fbd20b7d17c5109cc3` |
| 5 | chalk/chalk | JavaScript/TypeScript | primary | `e91293130c7d642c7b91152c3c942743a3b910a7` |
| 6 | psf/black | Python | primary | `db2e3e7b317b40685ba4618235a8388c7c6ea5e2` |
| 7 | Masterminds/semver | Go | primary | `8b89c86cb53c57cfd5d07c13de12bc4d78954e99` |
| 8 | tokio-rs/bytes | Rust | primary | `d5c8ad3227afe459c09f1d0d85455abf00f0381a` |
| 9 | npm/node-semver | JavaScript/TypeScript | fallback | `6e05b7637396ac66522cff8731f07cfe0ef49a29` |
| 10 | python-attrs/attrs | Python | fallback | `f06ceaafbe5bdbdafad8a0c01a2daabb89386a42` |
| 11 | go-chi/render | Go | fallback | `14f1cb3d5c2969d6e462632a205eacb6421eb4dc` |
| 12 | BurntSushi/bstr | Rust | fallback | `08a77375dfa8e3cf5473f8afd22f2552988a10cf` |

冻结池文件：
`docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-6.json`

## 冻结任务分类器

`scripts/lib/commit-task-classifier.cjs` 定义
`inflected-behavioral-subject-v1`：

- Conventional Commit 的 `fix` 映射为 `bugfix`，`feat` 映射为 `feature`。
- 功能前缀包含 `Add`、`Allow`、`Create`、`Implement`、`Introduce`、
  `Support`、`Enable` 的原形和常见变化形式。
- 修复前缀包含 `Fix`、`Debug`、`Repair`、`Correct`、`Resolve`、
  `Prevent`、`Avoid` 的原形和常见变化形式。
- `Refactor`、`Update`、`Bump` 和只有子系统名称的模糊标题仍不分类。

分类器只推导任务类别，不读取文件内容，也不对仓库进行排序。

## 机械提交资格

每个被检查仓库最多查看最新 300 个非合并提交。只有同时满足以下条件才选择：

1. 提交只有一个 parent，且 parent 可用。
2. 第一条非空标题长度为 20 至 180 字符，并由冻结分类器得到任务类型。
3. diff 只修改 2 至 6 个文件；新增、删除、复制、重命名都不合格。
4. 所有改动文件都属于仓库冻结的源码扩展名。
5. 排除文档、示例、fixture、snapshot、生成物、锁文件、vendor 和 benchmark。
6. diff 至少包含一个实现文件和一个聚焦测试文件。
7. 总改动行数为 2 至 400。
8. 所有 oracle 文件在路线提交和真实提交中都存在。

未经改写的提交标题直接成为任务，完整的修改文件集合成为 oracle。禁止人工改写、
挑题或看过结果后替换目标。

## 环境与证据政策

每个仓库最多物化三次，间隔五秒，并记录每次尝试。只有同语言家族中已经预注册的
下一个仓库，才能在 setup 失败或无合格提交时接替。

选择阶段只写一个 create-only manifest：

`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-6.json`

选择器记录所有检查、拒绝、选中、跳过与 setup 失败，并固定
`palaceCallsOnCandidateTasksDuringSelection: 0`。选择本身不能证明产品通过或失败；
必须先另行提交验证协议和 harness，之后才能把候选任务交给 Palace。

## 命令

只有在选择阶段文件全部提交且 tracked worktree 干净后运行：

```powershell
node scripts/select-held-out-routing-targets-round-6.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-6.json
```
