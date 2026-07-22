# 未见路由目标选择协议（0.4 Alpha，第二轮）

## 状态

本协议在查看任何候选仓库历史、或对任何候选任务调用 Vertex Palace 之前预注册。必须先提交本协议与 `scripts/select-held-out-routing-targets-round-2.cjs`，才能执行选择。

## 冻结产品

产品候选版本为 `0ef19a7bbef1901d813b81389405f87482db47c5`。在选择与 held-out 验证期间，产品源码、生成的 MCP bundle、package metadata 与构建配置全部冻结。

已经影响过研发或研究的仓库全部排除：Zod、Requests、p-limit、Fastify、Click、date-fns、ripgrep、Cobra 与 Marked。第二轮候选池不包含这些研究中出现过的仓库 URL。

## 仓库池

仓库顺序与 pinned HEAD 都是固定输入。HEAD 只通过 `git ls-remote <url> HEAD` 取得，没有查看 commit 历史、diff、任务 subject 或 Palace 路由结果。

| 顺序 | 仓库 | 语言家族 | Pinned HEAD |
| ---: | --- | --- | --- |
| 1 | [expressjs/express](https://github.com/expressjs/express) | JavaScript | `ae6dd37680e3a00618d6c8a3e522f0ee4eeba1a4` |
| 2 | [encode/httpx](https://github.com/encode/httpx) | Python | `b5addb64f0161ff6bfe94c124ef76f6a1fba5254` |
| 3 | [urfave/cli](https://github.com/urfave/cli) | Go | `c6f4cf7e9223793478cfcde9b8f135cc8f86e78f` |
| 4 | [clap-rs/clap](https://github.com/clap-rs/clap) | Rust | `466b2be56c5811d1af62c407f5a00456350ece62` |
| 5 | [tj/commander.js](https://github.com/tj/commander.js) | JavaScript/TypeScript | `ba6d13ddb4243e5913367734f8c159089ffe7834` |
| 6 | [pytest-dev/pytest](https://github.com/pytest-dev/pytest) | Python | `b4e846616cbb0ba74dc548f7066b09d820f5dc05` |
| 7 | [go-chi/chi](https://github.com/go-chi/chi) | Go | `8b258c7bb28f97a5f2a856ff7ef962578fec9215` |
| 8 | [tokio-rs/axum](https://github.com/tokio-rs/axum) | Rust | `0704574455272caa79ff3ae8207adf8f620516c9` |

选择器必须产生六个目标，并覆盖 JavaScript/TypeScript、Python、Go 与 Rust。每个尚未出现的语言家族由顺序中第一个合格仓库取得席位，另外两个扩展席位也依仓库顺序填入。当两个扩展席位已经占满时，同语言仓库不会被检查，除非仍缺少该语言家族。

## 机械选择 commit

对于固定算法实际到达的仓库，选择器从 pinned HEAD 向后检查最多 250 个 non-merge commit，并选择第一个满足所有条件的 commit：

1. 只有一个 parent。
2. Commit subject 长度为 20-180 字符，并以 fix、feat、add、allow、prevent、support、improve 等行为动作开头。
3. Diff 修改 2-6 个文件，而且每个状态都是 `M`。
4. 每个改动文件都使用该仓库声明的源码扩展名。
5. 至少一个 implementation 文件和一个 focused test path。
6. 排除文档、生成产物、fixtures、snapshots、benchmarks、examples、vendor、build output、lockfiles 与 binary diff。
7. additions 加 deletions 必须介于 2 与 400 行。

任务文字直接使用未经改写的 Git commit subject。Route commit 是该 commit 的 parent；ground-truth commit 与完整 changed-file diff 组成 oracle。

选择器不会调用 Vertex Palace。它只会以 create-only 方式写入 `docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-2.json`。如果选择失败，失败 manifest 也必须保留；查看历史后不得人工替换目标。

## 选择前冻结的验证门槛

Manifest 提交后，另一份预注册 harness 会对每个目标顺序执行两次 `evaluate` 与 `context --auto`，使用 6,000 token budget、route limit 9 与最多 4 个 drawers。

晋级必须满足：

- 六个目标都完成两次 trial；
- task type 保持为 `bugfix`；
- aggregate changed-file coverage 至少 `0.90`，并且每个目标都覆盖其全部 implementation 与 test 文件；
- aggregate route focus 与 precision 至少 `0.75`，且没有单一目标低于 `0.50`；
- 两次执行的 route files 完全一致；
- overconfident trial 为零；
- context 不超过 6,000 estimated tokens；
- 索引 fresh、tracked worktree 干净、selected/excluded boundary 不重叠。

Aggregate coverage 门槛不会因为非核心附属文件漏掉一个就全盘失败，但每个目标的 implementation/test 要求仍然保留多表面核心条件。产品失败、harness contract 失败和环境/setup 失败将分别记录。观察结果后不能替换失败目标。

即使通过，这也只代表静态 held-out 路由证据，不能证明 Agent 正确率、Token 节省或执行速度。

## 选择命令

只能在协议与选择器提交后执行：

```powershell
node scripts/select-held-out-routing-targets-round-2.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-2.json
```
