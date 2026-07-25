# 未见路由目标选择协议（0.4 Alpha，第五轮）

## 状态

本协议在读取任何候选仓库历史、diff、commit 标题或任务之前预先登记，
也在对候选任务执行任何 Vertex Palace 调用之前冻结。必须先提交本协议、
英文版本、仓库池 JSON、选择器和预注册测试，之后才能执行目标选择。

这属于“对当前候选版本未见”的证据：这些仓库 URL 从未出现在之前的
Vertex Palace 研发或研究池中。但这不代表底层模型从未接触这些公开仓库。

## 冻结产品

- 产品候选：`f61207688badbe07818470a42441a3a966a8bdf0`
- CLI：`dist/palace.cjs`
- CLI SHA-256：
  `72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC`
- 冻结路径：`packages/` 与 `plugins/vertex-palace/mcp/server.cjs`

候选版本之后提交的研究文件不能改变这些运行时路径。若当前路径内容与
候选提交不同，或 CLI 哈希不一致，选择器必须拒绝运行。

## 完整排除边界

第五轮排除第四轮仓库池的全部 URL，也排除第四轮已经继承的历史仓库。
合并后的排除集合共有 41 个仓库，包括以前的主目标和未检查的 fallback。
预注册测试会从冻结的第四轮 pool 自动推导这个集合，并要求与第五轮
`previouslyObservedRepositories` 完全相等。

同一组织或生态不代表仓库独立。第五轮包含 Tokio、Serde 等曾经出现过
组织旗下的新仓库；这个限制会在最终结果中明确保留。

## 规模与语言平衡

第五轮选择 8 个目标，JavaScript/TypeScript、Python、Go、Rust 各 2 个。
每个语言家族预先固定 3 个仓库。按绑定顺序，前两个存在合格历史 commit
的仓库入选；第三个仅作 fallback。同语言已经填满两个名额后，不再检查
其 fallback 历史。

仓库顺序、语言家族、固定 HEAD、资格规则和 fallback 行为都在读取历史
之前确定。

## 冻结仓库池

所有 HEAD 只通过 `git ls-remote <url> HEAD` 获取。确定与排序仓库池时，
没有读取 commit 历史、diff、标题、候选任务或 Palace 结果。

| 顺序 | 仓库 | 语言家族 | 角色 | 固定 HEAD |
| ---: | --- | --- | --- | --- |
| 1 | sindresorhus/got | JavaScript/TypeScript | 主选 | `e3924aa1e53a6ca3eb93a43618ce532442a89b40` |
| 2 | django/django | Python | 主选 | `957d0cee7167757ae221ffde59d2cf0a322e89c7` |
| 3 | stretchr/testify | Go | 主选 | `001eb7946baf451879253643e4ce4b38eaa0d4a7` |
| 4 | tokio-rs/tokio | Rust | 主选 | `818e2dd866e0d6b0e25ebad8508722efa3a2f8fb` |
| 5 | vitest-dev/vitest | JavaScript/TypeScript | 主选 | `a31f86af738b2979905f6a61eb5d8848d489eed7` |
| 6 | python-trio/trio | Python | 主选 | `d0e762f56c80c2f6ca3603dc66a2595b3237e8c6` |
| 7 | go-resty/resty | Go | 主选 | `29010be3b22dde872740e1e39e50cf8c0eba189c` |
| 8 | serde-rs/serde | Rust | 主选 | `747814f7d5fbab872df3b02f070c165b91bde062` |
| 9 | TanStack/query | JavaScript/TypeScript | fallback | `fd50fa14d283c7d6664a796f758498d1ad5bfce7` |
| 10 | agronholm/anyio | Python | fallback | `caca0e076d4052fca751f1a6b5e248bb4901f6cd` |
| 11 | rs/zerolog | Go | fallback | `9c53f4ea79c89f42478eb1e0c0414e4d68594506` |
| 12 | tower-rs/tower-http | Rust | fallback | `44bed484bf03f70782b1011b6cb527abb83e675c` |

冻结仓库池：
`docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-5.json`

提交这些预注册文件之后、执行选择之前，再记录 pool 的 SHA-256。

## 机械资格规则

对每个实际检查的仓库，最多读取最新 300 个非 merge commit，并选择首个
同时满足以下条件的 commit：

1. 只有一个 parent，而且 parent 对象可用。
2. 第一行非空标题长度为 20 至 180 个字符。
3. 在 Palace 暴露之前可以机械推导任务类型：
   - Conventional Commit `fix` 对应 `bugfix`。
   - Conventional Commit `feat` 对应 `feature`。
   - 以 `Add`、`Allow`、`Create`、`Implement`、`Support` 开头对应
     `feature`。
   - 以 `Fix`、`Debug`、`Repair`、`Correct`、`Resolve` 开头对应
     `bugfix`。
4. diff 修改 2 至 6 个文件；新增、删除、复制和重命名均不合格。
5. 所有修改文件都必须符合该仓库预先固定的源码扩展名。
6. 排除文档、示例、fixture、snapshot、生成物、lockfile、vendor 和
   benchmark 路径。
7. diff 至少包含一个实现文件和一个聚焦测试文件。
8. 修改行数为 2 至 400 行。
9. 每个 Oracle 文件在 route commit 与 ground-truth commit 两侧都存在。

原始 commit 标题直接成为任务，完整修改文件集合直接成为 Oracle。不得
人工重写任务、挑选有利文件、cherry-pick 或在看到结果后替换目标。

## 环境政策

每个仓库最多物化 3 次，重试间隔 5 秒，并记录每次尝试。若仍无法准备，
记为环境设置失败，只能继续使用同语言中已经预先登记的下一个仓库。

禁止根据产品结果替换仓库。

## 证据保存

选择器只新建以下 manifest，禁止覆盖：

`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-5.json`

manifest 必须记录所有已检查、拒绝、入选、跳过和设置失败的仓库，以及
拒绝原因统计和物化尝试。选择器固定记录
`palaceCallsOnCandidateTasksDuringSelection: 0`，也不能包含 Palace 调用路径。

目标选择本身不能判定产品通过或失败。manifest 提交并计算哈希后，还必须
单独提交验证协议与一次性执行器，之后才能把入选任务交给 Palace。

## 命令

只有在所有选择阶段文件已经提交且受跟踪工作树干净时，才能运行：

```powershell
node scripts/select-held-out-routing-targets-round-5.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-5.json
```
