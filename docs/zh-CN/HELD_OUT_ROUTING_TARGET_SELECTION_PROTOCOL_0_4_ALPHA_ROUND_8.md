# 未见置信度校准目标选择协议（0.4 Alpha，Round 8）

## 状态与声明边界

本协议在读取任何 Round 8 仓库历史、diff、提交标题或任务之前预注册，也早于
任何候选任务被交给 Vertex Palace。英文与简体中文协议、仓库池、选择器、
分类器和契约测试必须先提交，之后才能运行选择。

这些仓库没有进入过 Vertex Palace 产品研发或先前研究池；但这不表示底层模型
从未见过这些公开仓库。

## 冻结的成对产品

Round 8 计划在同一批新任务上成对比较基线与候选版本的置信度校准。两个版本都
早于新仓库池的选择，并已提前冻结。

| 角色 | 产品提交 | CLI SHA-256 |
| --- | --- | --- |
| 基线：加入独立任务锚点置信度上限之前 | `228c3bde47f6930023496fdd0a54d43dba10091f` | `E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F` |
| 候选：包含独立任务锚点置信度上限 | `1a02d89269acb36473db3ad39badab9fe338a4a3` | `49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747` |

两个版本都使用 `dist/palace.cjs`。基线 CLI 已在预注册前从对应提交离线重建并
核对哈希。候选冻结运行路径为 `packages/` 与
`plugins/vertex-palace/mcp/server.cjs`；路径或候选 CLI 哈希不同，选择器都会
拒绝运行。

## 为什么必须进行新的留出轮次

Round 7 已公开任务上的回归显示：候选修复没有改变 16 条路线，但把错误高置信
试验从 4 条降到 0 条。由于修复是在这些任务已知之后设计的，这项结果不能证明
可泛化。

因此 Round 8 不改变 Round 7 的取样规则，而是选择全新的候选未见任务。后续
验证器会让冻结基线与候选处理完全相同的任务。置信度变化不等于路线变好；
coverage、focus、模式选择和实际交付上下文必须分开报告。降低置信度还可能增加
上下文，所以仅凭校准改善不能宣称节省 Token 或时间。

## 完整排除边界

排除集合共有 81 个仓库：Round 7 已排除的 65 个，加上 Round 7 池内全部 16 个，
包括未检查的 fallback。预注册测试会机械推导这个并集，并要求它与 Round 8
`previouslyObservedRepositories` 完全一致。

不同仓库仍可能属于过去出现过的组织或生态；最终报告会声明这项限制。仓库 URL
不能重复。

## 数量与仓库顺序

Round 8 要选择 8 个目标：JavaScript/TypeScript、Python、Go、Rust 各 2 个。
每种语言固定 4 个仓库，按交错顺序检查；最先出现的两个合格仓库入选，该语言
配额填满后其余仓库不再检查。

HEAD 只通过 `git ls-remote <url> HEAD` 取得。选择顺序时没有读取新仓库历史、
diff、标题或任务。

| 顺序 | 仓库 | 语言家族 | 角色 | 固定 HEAD |
| ---: | --- | --- | --- | --- |
| 1 | yargs/yargs | JavaScript/TypeScript | primary | `db916b4154271e4cbbd2c60618fab90bdc1dbac2` |
| 2 | sqlalchemy/sqlalchemy | Python | primary | `aa1a5575358d3aa14953b04dced02f4763fed2e7` |
| 3 | uber-go/zap | Go | primary | `5b81b37b81b8e2ed447a6f57991e372ee4fa5c8f` |
| 4 | rust-lang/regex | Rust | primary | `2b527599eb9eea0dcc288c704584f242f26a5c61` |
| 5 | sinonjs/sinon | JavaScript/TypeScript | primary | `ab289e92cdd76caf8cec2b0a8c9a391283e6c9df` |
| 6 | Textualize/rich | Python | primary | `9d8f9a372cc5916fd4781fec207ced7ddac2f08f` |
| 7 | spf13/viper | Go | primary | `528f7416c4b56a4948673984b190bf8713f0c3c4` |
| 8 | crossbeam-rs/crossbeam | Rust | primary | `b23b7e8eca2efdad9bdc1ceb1aee1207a852c03b` |
| 9 | prettier/prettier | JavaScript/TypeScript | fallback 1 | `8ffc849446ffa4a882197dff4cdc7321f0d88972` |
| 10 | celery/celery | Python | fallback 1 | `dd7c23862eb08a2cfde7da6926f28410b699c077` |
| 11 | gorilla/mux | Go | fallback 1 | `db9d1d0073d27a0a2d9a8c1bc52aa0af4374d265` |
| 12 | rust-lang/hashbrown | Rust | fallback 1 | `227319c890c9663e953fdae44fd78e1c3a38bac3` |
| 13 | ajv-validator/ajv | JavaScript/TypeScript | fallback 2 | `f177fe323420ccb23e1a79445fd470cbf80aee7c` |
| 14 | scrapy/scrapy | Python | fallback 2 | `e710b9c18e18f0a3fe104fbfc72d49c221dfe448` |
| 15 | google/uuid | Go | fallback 2 | `2d3c2a9cc518326daf99a383f07c4d3c44317e4d` |
| 16 | hyperium/http | Rust | fallback 2 | `2178e175c4e247a33ba5f6ca3503afb1afbaabba` |

冻结池文件：
`docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-8.json`

## 任务分类

冻结的 `inflected-behavioral-subject-v1` 与 Round 6、Round 7 完全相同。
Conventional `fix`、`feat` 和已经测试的行为动词原形与变化形式，会机械映射到
`bugfix` 或 `feature`；模糊维护标题仍不分类。

## 机械提交资格

每个仓库最多检查最新 300 个非合并提交，只有同时满足以下条件才选择：

1. 只有一个可用 parent。
2. 第一条非空标题长度为 20 至 180 字符，并能得到冻结任务类型。
3. diff 修改 2 至 8 个文件，所有状态都是 `M`。
4. 至少一个实现文件和一个聚焦测试文件使用仓库冻结的主要语言扩展名。
5. 最多 2 个已修改的文档或配置文件可以作为辅助文件；它们必须在两个比较提交
   中都存在，而且仍属于 oracle。
6. 辅助扩展名限 `.cfg`、`.conf`、`.ini`、`.json`、`.md`、`.mdx`、
   `.rst`、`.toml`、`.txt`、`.yaml`、`.yml`；精确文件名 `.flake8` 和
   `go.mod` 也允许。
7. 排除生成物、锁文件、vendor、fixture、snapshot、示例、benchmark、
   build、coverage 和 dist。
8. 总改动为 2 至 400 行，所有 oracle 文件在路线提交与真实提交中都存在。

未经改写的标题成为任务；全部合格修改文件，包括辅助文件，一起构成 oracle。
禁止人工改题或替换目标。

## 环境与证据政策

每个仓库最多物化三次，间隔五秒并记录尝试。setup 失败或没有合格提交时，只能
继续同语言家族中下一个已经预注册的仓库。

选择只写一个 create-only manifest：

`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-8.json`

选择器没有 Palace 调用路径，并记录
`palaceCallsOnCandidateTasksDuringSelection: 0`。如果选择失败，仍保存失败
manifest，不修改规则或替换仓库。选择本身不是产品验证；必须先另外提交成对验证
协议、验证器和测试，之后才能把候选任务交给任一 Palace 版本。后续校准容差已
预注册为 `0.15`。

## 命令

选择阶段文件全部提交且 tracked worktree 干净后才能运行：

```powershell
node scripts/select-held-out-routing-targets-round-8.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-8.json
```
