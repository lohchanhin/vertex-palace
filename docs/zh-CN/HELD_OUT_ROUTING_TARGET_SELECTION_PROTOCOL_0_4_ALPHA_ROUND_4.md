# Held-out 路由目标选择协议（0.4 Alpha，第四轮）

## 状态

本协议在读取任何候选仓库 history、diff、commit subject 或任务之前预注册，也在
对任何候选任务调用 Vertex Palace 之前预注册。英文协议、这份简体中文辅助说明、
repository-pool JSON、selector 与回归测试必须先提交，之后才能执行选择。

这里的 held-out 是“相对于产品候选版本未见”：这些仓库 URL 从未出现在 Vertex
Palace 之前的开发或研究候选池。它不声称底层模型从未在公开资料中见过这些仓库。

## 冻结产品

- 产品候选版本：
  `efd53274e42fb8123745f2b8bb09a24e4fa384b7`
- CLI：`dist/palace.cjs`
- CLI SHA-256：
  `E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0`
- 冻结 tracked 路径：`packages/` 与
  `plugins/vertex-palace/mcp/server.cjs`

候选版本之后提交的研究报告和 harness 不会改变这些 runtime 路径。若当前 runtime
路径与候选 commit 不一致，或 CLI hash 不一致，选择器会拒绝运行。

## 完整排除边界

新候选池排除第三轮 selector 记录过的全部仓库 URL，包括早期开发目标与当时没有
检查的 fallback，共 29 个。回归测试会从冻结的第三轮 manifest 机械生成这个集合，
并要求它与新 pool 的 `previouslyObservedRepositories` 完全一致。

同一组织或生态不自动视为重复仓库。例如 Uvicorn 是新的仓库 URL，虽然 Encode 的
其他仓库曾经被观察。这是明确披露的限制，不冒充完全独立。

## 研究规模与平衡

第四轮选择八个目标：JavaScript/TypeScript、Python、Go、Rust 各两个。每个语言
家族固定三个仓库；最先出现且拥有合格历史 commit 的两个仓库入选，第三个仅作为
fallback。若该家族两个名额已满，fallback 不得再检查。

仓库顺序、语言家族、pinned HEAD、合格规则和 fallback 行为，都在读取 history
前冻结。

## 冻结仓库候选池

Pinned HEAD 只通过 `git ls-remote <url> HEAD` 获得。固定候选池时没有读取 commit
history、diff、subject、目标任务或 Palace 结果。

| 顺序 | 仓库 | 家族 | 角色 | Pinned HEAD |
| ---: | --- | --- | --- | --- |
| 1 | nodejs/undici | JavaScript/TypeScript | primary | `9f09b49accd391cca818409447f2fb8bc93229b3` |
| 2 | aio-libs/aiohttp | Python | primary | `7ffc8aeb6cd644fb3b2b41ae3b4d787d4b8217d4` |
| 3 | go-playground/validator | Go | primary | `fd8bd3c9d513cd1d29e495974fa07dba7a2b5936` |
| 4 | tokio-rs/tracing | Rust | primary | `d9d4c542de10f5d3a711b7a45ffe450fd0666437` |
| 5 | mswjs/msw | JavaScript/TypeScript | primary | `49d9d47f613b072f8d20e1a025feaee7c5382b2b` |
| 6 | encode/uvicorn | Python | primary | `d26c85c27bb8ea66237ff43f90ca23b774a3c1ce` |
| 7 | go-gorm/gorm | Go | primary | `1d6ce99528060be18a42be09aca8d39efcb47f28` |
| 8 | seanmonstar/reqwest | Rust | primary | `221abe9ec921e22fe1bafaed47b51b03bed4b7c3` |
| 9 | vitejs/vite | JavaScript/TypeScript | fallback | `791843e1591ec2d65a401560bc1fc0a85b32ee32` |
| 10 | python-poetry/poetry | Python | fallback | `f46702336862f30050d5c641d5ed6f7568ded793` |
| 11 | redis/go-redis | Go | fallback | `5c82f57a47e097b32509ac2abd3d7c9d57f5100b` |
| 12 | rayon-rs/rayon | Rust | fallback | `1f9bb2538e50f1e6d1bc2e3d06a361ba2af0b632` |

冻结 pool：
`docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-4.json`

Pool SHA-256：
`DF36C82D51AF4B91DF6E67E9848AD54EBB5FE99E9F4DF03498BC1A0FFD6E1A0A`

## 机械 commit 合格规则

每个被检查仓库最多扫描最新 300 个 non-merge commit。只有同时满足以下条件的最新
commit 才会入选：

1. Commit 只有一个 parent，且 parent 可用。
2. 第一条非空 subject 长度为 20 至 180 个字符。
3. 在 Palace 接触任务前，能机械推导 expected task type：
   - Conventional Commit `fix` 对应 `bugfix`。
   - Conventional Commit `feat` 对应 `feature`。
   - 以 `Add`、`Allow`、`Create`、`Implement` 或 `Support` 开头，对应
     `feature`。
   - 以 `Fix`、`Debug`、`Repair`、`Correct` 或 `Resolve` 开头，对应
     `bugfix`。
4. Diff 修改两个至六个文件；新增、删除、复制或 rename 均不合格。
5. 所有改动文件都必须使用该仓库冻结的 source extension。
6. 排除文档、examples、fixtures、snapshots、生成结果、lockfiles、vendor 与
   benchmark 路径。
7. Diff 至少包含一个实现文件与一个 focused test 文件。
8. 总改动行数介于 2 至 400。
9. 每个 oracle 文件在 route commit 与 ground-truth commit 两边都存在。

未经改写的 commit subject 直接成为任务；完整 modified-file diff 直接成为
oracle。禁止人工润色、挑选或替换目标。

## 环境规则

每个仓库最多 materialize 三次，每次之间等待五秒，而且每次尝试都要记录。三次仍
无法准备的仓库会成为 setup failure，只能继续检查同一语言家族中已经预注册的下一
个仓库。

禁止根据 Palace 结果或任务内容临时换仓库。

## 证据保存

选择阶段只能 create-only 写入：

`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-4.json`

Selector 拒绝覆盖现有文件。Manifest 必须记录所有被检查、拒绝、选中、跳过和
setup-failed 的仓库，包括 rejection count 与 materialization attempts。

选择阶段本身不能判产品通过或失败。Manifest 提交并计算 hash 后，必须再提交独立
的验证协议与 harness，才允许把任何已选任务交给 Palace。

## 命令

只可在选择阶段文件全部提交、tracked worktree 清洁后执行：

```powershell
node scripts/select-held-out-routing-targets-round-4.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-4.json
```
