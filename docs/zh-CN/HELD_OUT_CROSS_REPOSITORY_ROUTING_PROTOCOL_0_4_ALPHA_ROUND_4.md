# Held-out 跨仓库路由验证协议（0.4 Alpha，第四轮）

## 状态

本协议在机械选择目标之后预注册，也在候选版本 `efd5327` 对任何已选任务执行
init、index、route、evaluate、context 或 pack 之前预注册。英文协议、这份简体
中文辅助说明、验证 harness 与 manifest 回归测试必须先提交，之后才能产生第一次
正式观察。

## 冻结输入

- 产品候选版本：
  `efd53274e42fb8123745f2b8bb09a24e4fa384b7`
- 候选 CLI SHA-256：
  `E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0`
- Selector commit：
  `96af578295484831e4a14511baf0e88cb69cc081`
- Target manifest commit：
  `7ccf0c7d668f4a9790186ba4659a76fd4a30813d`
- Target manifest：
  `docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-4.json`
- Target manifest SHA-256：
  `D6A1DDCDA3BD704D1F809279229153F72B4CF6162F1C1231C40D36F18626F5C0`
- Repository pool SHA-256：
  `DF36C82D51AF4B91DF6E67E9848AD54EBB5FE99E9F4DF03498BC1A0FFD6E1A0A`
- 本协议前对已选任务执行的 Palace 调用：`0`

Runtime 路径 `packages/` 与 `plugins/vertex-palace/mcp/server.cjs` 必须和产品
候选 commit 完全一致。Harness 在正式测量前不会重新 build，而是直接核对冻结的
CLI hash。

## 机械选择的目标

Expected task type、route commit、ground-truth commit 与完整 modified-file
oracle 都在 Palace 接触任务前冻结。

| 仓库 | 类型 | 任务 | Oracle 文件 |
| --- | --- | --- | --- |
| Undici | bugfix | `fix: handle empty qualified private cache directive` | `lib/util/cache.js`；`test/cache-interceptor/utils.js`；`test/interceptors/cache.js` |
| aiohttp | bugfix | `Fix parse_mimetype producing spurious empty-key parameter for whitespace-only segments after semicolons (#13010)` | `aiohttp/helpers.py`；`tests/test_helpers.py` |
| validator | feature | `Add English translations for prefix and suffix validators (#1583)` | `translations/en/en.go`；`translations/en/en_test.go` |
| tracing | feature | `Support constant expressions as instrument field names (#3158)` | `tracing-attributes/src/attr.rs`；`tracing-attributes/src/expand.rs`；`tracing-attributes/src/lib.rs`；`tracing-attributes/tests/fields.rs` |
| MSW | bugfix | `fix(HttpResponse): forward cookies only when response is used (#2728)` | `src/core/handlers/RequestHandler.ts`；`src/core/utils/HttpResponse/decorators.ts`；`src/core/utils/request/storeResponseCookies.ts`；`test/browser/rest-api/request/request-cookies.mocks.ts` |
| Uvicorn | bugfix | `Fix typo: error_occured -> error_occurred (#2776)` | `tests/test_lifespan.py`；`uvicorn/lifespan/on.py` |
| GORM | bugfix | `Fix potential rows leak on panic by deferring rows.Close() (#7798)` | `callbacks/delete.go`；`callbacks/update.go`；`finisher_api.go`；`tests/query_test.go` |
| Reqwest | feature | ``feat: expose the negotiated TLS version via `TlsInfo` (#3067)`` | `src/connect.rs`；`src/tls.rs`；`tests/client.rs` |

Harness 会在调用 Palace 之前，直接从 Git 重新验证每个完整 subject、parent 关系、
`M` 状态、changed-file 列表、文件在两边的存在性，以及 expected task type。

## Oracle 限制

Git diff 可复现，但实现／测试角色来自路径规则。测试目录下的改动文件可能是 helper、
mock 或 fixture，不一定本身包含断言。Undici 的 test utility 与 MSW 的
`request-cookies.mocks.ts` 已经明确显示这个限制。

因此本研究测量的是 Palace 是否找回冻结规则选择的完整历史改动边界；它不声称每个
`testFiles` 文件都能独立执行断言，也不会运行目标仓库自身测试。

## 执行方式

每个仓库都在 route commit 新鲜 materialize。Git materialization 最多尝试三次，
每次都记录。冻结 CLI 随后建立全新 Palace，并显式索引仓库。

只有 index 进程回报 `ETIMEDOUT`、`EAGAIN` 或 `ENOMEM` 时，新鲜索引才可尝试
第二次；第二次之前必须删除 `.palace`。非 transient 的 index 失败不得重试。

每个目标接着执行两次顺序 formal trial。每次 trial 依次运行 `evaluate` 与
`context --auto`：

- budget：6,000 estimated input tokens；
- route limit：9 个文件；
- maximum drawers：4；
- evaluate 与 context 都不重试；
- 不并发执行目标或 repetition。

重试规则可以降低 Git transfer 或 index host 中断对静态正确性观察的影响，但也
意味着记录的 elapsed time 不能被解释为干净的性能比较。

## 晋级门槛

只有全部满足才通过：

- 八个目标都完成两次 trial；
- 每个观察到的 task type 都与冻结 expected type 一致；
- 每个目标都找回所有声明的实现文件和 path-derived test 文件；
- macro changed-file coverage 至少 `0.90`；
- macro route focus 与 route precision 都至少 `0.75`；
- 单一目标 route focus 与 route precision 都不得低于 `0.50`；
- 两次执行的路线顺序与成员完全一致；
- 不得出现相对真实 coverage 的 `overconfident` trial；
- context 不超过 6,000 estimated tokens；
- selected 与 excluded boundary 不重叠；
- 显式索引后 status 必须 fresh；
- Palace 不得修改目标仓库的 tracked 文件。

Exact-oracle target 数量会报告，但不是额外门槛。所有阈值沿用第三轮，并不是看到
第四轮路线后才选择。

Environment/setup、harness-contract 与 product/contract 失败必须分开记录。任何
未解决类别都禁止晋级。失败输出不得覆盖，目标不得替换，evaluate/context trial
也不得在同一个 evidence path 下重跑。

## 证据保存

第一次正式观察只能 create-only 写入：

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-4.json`

原始证据必须先原样提交并计算 hash，之后才能解释或开始产品修复。

## 声明边界

通过只支持这个八目标平衡样本中的 candidate-held-out 静态路由泛化。仓库都是公开
项目，不声称底层模型未见。本研究没有执行目标测试，因此不能证明最终 Agent
正确率、reported Token 降低、wall time 降低或工具调用减少。

失败会拒绝进入 Agent A/B，并把八个任务全部转为已公开开发数据。即使通过，也只
允许开始规划另一个预注册、顺序执行的 Agent 研究。

## 命令

只可在协议与验证 harness 已提交、tracked worktree 清洁后运行：

```powershell
node scripts/verify-held-out-cross-repository-routing-round-4.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-4.json
```
