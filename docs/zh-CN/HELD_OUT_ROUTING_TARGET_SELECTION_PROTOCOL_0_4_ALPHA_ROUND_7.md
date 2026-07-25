# 未见路由目标选择协议（0.4 Alpha，Round 7）

## 状态与声明边界

本协议在读取任何 Round 7 仓库历史、diff、提交标题或任务之前预注册，也早于
任何候选任务被交给 Vertex Palace。英文与简体中文协议、仓库池、选择器、
分类器和测试必须先提交，之后才能运行选择。

这些仓库没有进入过 Vertex Palace 产品研发或先前研究池；但这不表示底层模型
从未见过这些公开仓库。

## 冻结产品

- 产品提交：`f61207688badbe07818470a42441a3a966a8bdf0`
- CLI：`dist/palace.cjs`
- CLI SHA-256：
  `72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC`
- 冻结运行路径：`packages/` 与 `plugins/vertex-palace/mcp/server.cjs`

只要冻结路径或 CLI 哈希不同，选择器就会拒绝运行。

## 在读取新历史前修订协议

Round 5 与 Round 6 都只得到 7/8 个目标，Python 均为 1/2。两轮选择的 Palace
调用都是 0，也都没有环境失败。Round 6 证明动词变化分类器改善了标题资格，但
“所有文件必须是主要语言源码”的 oracle 规则仍可能排除同时修改文档、
changelog 或配置的真实任务。

Round 7 只调整研究取样，Vertex Palace 产品继续冻结。在读取新历史前固定两项
通用修订：

1. 每个语言家族由 3 个预注册仓库增加为 4 个。
2. 每个目标仍必须包含实现源码和聚焦测试源码，但可以额外包含最多 2 个已修改的
   文档或配置文件；辅助文件仍属于 oracle。

生成物、锁文件、vendor、fixture、snapshot、示例和 benchmark 继续排除。如果
Round 7 失败，仍保存失败 manifest，不修改规则或临时换仓库。

## 完整排除边界

排除集合共有 65 个仓库：Round 6 已排除的 53 个，加上 Round 6 池内全部 12 个，
包括未检查的 fallback。预注册测试会机械推导并集，并要求它与 Round 7
`previouslyObservedRepositories` 完全一致。

不同仓库仍可能属于过去出现过的组织或生态；最终报告会声明这项限制。仓库 URL
不能重复。

## 数量与仓库顺序

Round 7 要选择 8 个目标：JavaScript/TypeScript、Python、Go、Rust 各 2 个。
每种语言固定 4 个仓库，按交错顺序检查；最先出现的两个合格仓库入选，该语言
配额填满后其余仓库不再检查。

HEAD 只通过 `git ls-remote <url> HEAD` 取得。选择顺序时没有读取新仓库历史、
diff、标题或任务。

| 顺序 | 仓库 | 语言家族 | 角色 | 固定 HEAD |
| ---: | --- | --- | --- | --- |
| 1 | sindresorhus/execa | JavaScript/TypeScript | primary | `499fe800361e6b383b0085f635a69fd27e6cf447` |
| 2 | pallets/jinja | Python | primary | `5ef70112a1ff19c05324ff889dd30405b1002044` |
| 3 | hashicorp/go-multierror | Go | primary | `6d4d48630db25c3c83fa83ecd41dd8438b82963c` |
| 4 | dtolnay/thiserror | Rust | primary | `aa9d91f75302025e0c1d4c535d84a5bfdad62508` |
| 5 | isaacs/node-glob | JavaScript/TypeScript | primary | `9f70854bd1d0bc7e715622a6df987f34d180248e` |
| 6 | encode/httpcore | Python | primary | `10a658221deb38a4c5b16db55ab554b0bf731707` |
| 7 | julienschmidt/httprouter | Go | primary | `484018016424d215c0b87c42f4c9b57d980fbd00` |
| 8 | tokio-rs/mio | Rust | primary | `7654f571f2474a1774a4f6e1004a4c17c50f64c7` |
| 9 | floating-ui/floating-ui | JavaScript/TypeScript | fallback 1 | `12d94738472e922e1b3fa31b02b2b61b9ed77e6a` |
| 10 | tox-dev/tox | Python | fallback 1 | `ccb12fc2e1bb9df0da860be4af175e9b97949fbc` |
| 11 | rs/cors | Go | fallback 1 | `2f30c9cf7731f7b5e0e372678d05acb22f2c2b4a` |
| 12 | rustls/rustls | Rust | fallback 1 | `bd9f7f59aa790da07010961188209e68384febe5` |
| 13 | reduxjs/redux-toolkit | JavaScript/TypeScript | fallback 2 | `58bb0e04c1e957f07b732b25473e13a0f975302a` |
| 14 | python-hyper/h11 | Python | fallback 2 | `62c5068c971579d61fa1b55373390e12f25fd856` |
| 15 | go-playground/universal-translator | Go | fallback 2 | `f83cd526536e253181a13835b00cd107f627c505` |
| 16 | indexmap-rs/indexmap | Rust | fallback 2 | `571943c5b3ec56eb2710e4bcbdda25557f7b3e49` |

冻结池文件：
`docs/research/evidence/held-out-routing-repository-pool-0.4-alpha-round-7.json`

## 任务分类

冻结的 `inflected-behavioral-subject-v1` 与 Round 6 完全相同。Conventional
`fix`、`feat` 和已经测试的行为动词原形与变化形式，会机械映射到 `bugfix` 或
`feature`；模糊维护标题仍不分类。

## 机械提交资格

每个仓库最多检查最新 300 个非合并提交，只有同时满足以下条件才选择：

1. 只有一个可用 parent。
2. 第一条非空标题长度为 20 至 180 字符，并能得到冻结任务类型。
3. diff 修改 2 至 8 个文件，所有状态都是 `M`。
4. 至少一个实现文件和一个聚焦测试文件使用仓库冻结的主要语言扩展名。
5. 最多额外允许 2 个文件，而且必须是已经存在的已修改文档或配置。
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

`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-7.json`

选择器没有 Palace 调用路径，并记录
`palaceCallsOnCandidateTasksDuringSelection: 0`。选择本身不是产品验证；必须先
另外提交验证协议与 harness，之后才能把候选任务交给 Palace。

## 命令

选择阶段文件全部提交且 tracked worktree 干净后才能运行：

```powershell
node scripts/select-held-out-routing-targets-round-7.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-7.json
```
