# Held-out 路由目标选择协议（0.4 Alpha，第三轮）

## 状态

本协议在读取任何候选仓库历史、diff、commit subject 或任务之前完成预注册，也早于任何针对候选仓库的 Vertex Palace 调用。必须先提交本协议和 `scripts/select-held-out-routing-targets-round-3.cjs`，才能执行目标选择。

## 冻结产品

产品候选版本固定为 `6060e0c6aa2aea64d0145c1e55bccdc4669e4b48`。选择及 held-out 验证期间，产品源码、生成的 MCP bundle、package metadata、lockfile、workspace 配置与 build 配置全部冻结。

过去开发或研究池出现过的仓库全部排除：Zod、Requests、p-limit、Fastify、Click、date-fns、ripgrep、Cobra、Marked、Express、HTTPX、urfave/cli、Clap、Commander、pytest、chi 与 axum。即使某仓库过去只是未检查的备用候选，也仍然排除。

## 研究规模与平衡

第三轮选择八个目标：JavaScript/TypeScript、Python、Go 与 Rust 各两个。每个目标顺序重复两次，因此正式观察共 `16` 次 trial。

仓库池按语言交错排列。每个语言家族最先出现的两个合格仓库获得名额；第三个仓库是 fallback，一旦该语言两个名额已满便不再检查。仓库顺序、语言归类和 pinned HEAD 均为冻结条件。

## 仓库池

Pinned HEAD 仅通过 `git ls-remote <url> HEAD` 取得。建立仓库池时没有读取 commit 历史、diff、subject、任务或 Palace 路线。

| 顺序 | 仓库 | 语言家族 | 角色 | Pinned HEAD |
| ---: | --- | --- | --- | --- |
| 1 | [koajs/koa](https://github.com/koajs/koa) | JavaScript | primary | `52d5e8ff5ac79f2479463b53df2999900ae95115` |
| 2 | [encode/starlette](https://github.com/encode/starlette) | Python | primary | `5174d4c8358a6f06aa8056bafd14c2272dab8dd1` |
| 3 | [gin-gonic/gin](https://github.com/gin-gonic/gin) | Go | primary | `34dac209ffb6ef85cc78c5d217bbb7ad001d68fd` |
| 4 | [tower-rs/tower](https://github.com/tower-rs/tower) | Rust | primary | `df06d70dbea345facbffb5881fe8647f53bf424d` |
| 5 | [axios/axios](https://github.com/axios/axios) | JavaScript/TypeScript | primary | `311fcc5c8d989b7248f05d390bb83bfbfb009977` |
| 6 | [pallets/flask](https://github.com/pallets/flask) | Python | primary | `36e4a824f340fdee7ed50937ba8e7f6bc7d17f81` |
| 7 | [labstack/echo](https://github.com/labstack/echo) | Go | primary | `ed8bbe4b6cbf519766c99e492b9cc427404b3719` |
| 8 | [serde-rs/json](https://github.com/serde-rs/json) | Rust | primary | `de8500740cdcabffb9734f503e4889def823cf10` |
| 9 | [honojs/hono](https://github.com/honojs/hono) | TypeScript | fallback | `44f884321a1d52e98d45a85634da9d5f4751a43a` |
| 10 | [pydantic/pydantic](https://github.com/pydantic/pydantic) | Python | fallback | `7b3dd4cf4ba551c33c963f22627cdc566402d8f6` |
| 11 | [gofiber/fiber](https://github.com/gofiber/fiber) | Go | fallback | `23c4f5957f31120b3afd82d223d773fe41957a06` |
| 12 | [hyperium/hyper](https://github.com/hyperium/hyper) | Rust | fallback | `67ace6484db5d4a15367013847768f5f94f4b97d` |

这个仓库池有意保持语言平衡，但并不是软件生态的随机样本。即使通过，也只能支持这批样本范围内的跨仓库泛化，不能推论整个生态的成功比例。

## 机械化 Commit 选择

对于绑定的语言配额算法实际检查到的仓库，selector 从 pinned HEAD 向前检查最多 300 个非 merge commit，选择第一个满足全部条件的 commit：

1. 只有一个 parent。
2. 未改写 subject 长度为 20-180 个字符。
3. 路由前即可机械确定任务类型：有或没有 scope 的 `fix:` 对应 `bugfix`；有或没有 scope 的 `feat:`，以及 Add、Allow、Implement、Support 开头的 subject 对应 `feature`。
4. Diff 修改 2-6 个文件，且所有文件状态均为 `M`。
5. 所有 changed file 都使用该仓库预先声明的源码扩展名。
6. 至少包含一个实现文件和一个聚焦测试文件。
7. 排除文档、生成输出、fixture、snapshot、benchmark、example、vendor、build output、lockfile 和 binary diff。
8. additions 加 deletions 必须介于 2 至 400 行。
9. 每个 oracle 文件在 route commit 与 ground-truth commit 中都必须存在。

任务文本直接使用未经改写的 Git commit subject。Route commit 是被选 commit 的 parent；ground-truth commit 与完整 changed-file diff 构成 oracle。

Selector 绝不调用 Vertex Palace，并以 create-only 方式写入 `docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-3.json`。选择失败也必须保留为证据；检查历史后不得人工替换仓库、commit 或任务。

## 选择前冻结的验证门槛

Manifest 提交后，另一个预注册 harness 会对每个目标顺序执行两次 `evaluate` 与 `context --auto`，使用 6,000 estimated-token budget、route limit 9 和最多 4 个 drawer。

晋级必须同时满足：

- 八个目标全部完成两次 trial；
- 实际 task type 与机械冻结的 expected type 一致；
- 每个目标都覆盖全部实现文件与聚焦测试文件；
- macro changed-file coverage 至少 `0.90`；
- macro route focus 与 precision 均至少 `0.75`；
- 任一目标的 focus 或 precision 都不能低于 `0.50`；
- 两次路线文件完全一致；
- overconfident trial 为 `0`；
- context 不超过 6,000 estimated tokens；
- index fresh、tracked worktree clean，且 selected/excluded boundary 不重叠。

Environment/setup、harness-contract 与 product/contract 失败分开报告，但任何一种都会阻止晋级。失败目标不得替换，也不得在修改候选版本后静默重跑。

通过仍然只代表静态 held-out 路由证据，不能证明最终 Agent 正确率、reported Token 节省、wall time 改善或工具调用减少。

## 选择命令

只能在本协议与 selector 提交后执行：

```powershell
node scripts/select-held-out-routing-targets-round-3.cjs --out docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-3.json
```
