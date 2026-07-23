# 已公开跨仓库路由开发回归（0.4 Alpha，第三轮）

## 结论

**作为已公开开发回归通过，但不能视为 held-out 证据。**
产品候选版本 `efd53274e42fb8123745f2b8bb09a24e4fa384b7` 在八个已公开仓库上
都精确命中了 Git diff oracle。顺序执行的 `16/16` 次试验全部通过，八个目标的
两次路线完全一致，macro changed-file coverage、route focus 与 route precision
均为 `1.00`。

这证明第三轮已经发现的静态路由错误，在记录下来的协议中得到修复。它不能证明
泛化能力、最终 Agent 正确率、Token 节省、wall time 降低或工具调用减少。因为
候选版本是在八个任务与 oracle 全部公开后开发的，所以原始第三轮 held-out 研究
仍然是失败，不能被这次回归追溯改写成通过。

## 证据链

旧结果没有被覆盖。原始 held-out 观察、第一次未完成的回归执行，以及完整成功
重跑，都分别保存为 create-only 原始文件。

| 阶段 | 候选版本 | 证据类别 | 通过目标 | 完成试验 | Macro coverage | Macro focus | Macro precision | Overconfident trials | 路线文件数 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 原始第三轮合并观察 | `6060e0c` | 预注册 held-out | 4/8 | 16/16 | 0.750 | 0.538 | 0.538 | 6 | 28 |
| 已公开回归第一次执行 | `efd5327` | 已公开开发数据 | 7/8 | 14/16 | 1.000* | 1.000* | 1.000* | 0* | 14* |
| 完整已公开回归 | `efd5327` | 已公开开发数据 | 8/8 | 16/16 | 1.000 | 1.000 | 1.000 | 0 | 16 |

`*` 第一次执行的指标只涵盖七个完成目标。Pydantic 的新鲜 `palace index` 进程
超过 180 秒上限，因此没有进入路由试验。旧 harness 把中断标成
`product-or-protocol-failed`；stack 位置与之后成功的新鲜索引重跑说明它是索引
超时，不是路线断言失败。原始 JSON 仍按当时输出保留，没有事后改写标签。

路线文件由 28 个降到 16 个，只能描述静态选择边界变得更聚焦，不能解释为
Agent 实际读取文件数、Token 或执行时间已经下降。

## 冻结证据

| 证据文件 | SHA-256 |
| --- | --- |
| `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3.json` | `7C1C0731008979D1DD3085EAEC86A43F277E3BFE588C86D43D5E11AFA5BD7EDF` |
| `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3-environment-recovery.json` | `E400C7C8AF72B10A18FAA51AED643EEEBC6F7A6DBF033C821C822A2E50719499` |
| `docs/research/evidence/disclosed-cross-repository-routing-0.4-alpha-round-3-regression-attempt-1-timeout.json` | `04A1AE84756717E2B4DD8139D349A93C8C67B43DAF0CCEC0014912E0E4A4DF5D` |
| `docs/research/evidence/disclosed-cross-repository-routing-0.4-alpha-round-3-regression.json` | `609F2664939B1CBDF30C9A0751A6219C8ED6BD9AC8081C095996BE9CC3016903` |
| `scripts/verify-disclosed-routing-round-3.cjs` | `B8B7245307C6906E0015E822528CF12E00913AE47ECBBC099CE7F53184E070B5` |

- 产品候选 commit：`efd53274e42fb8123745f2b8bb09a24e4fa384b7`
- 证据类别：`disclosed-development-regression`
- 相对于此候选版本是否 held out：`false`
- 成功执行记录的 CLI SHA-256：
  `E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0`

Harness 为每个仓库使用全新 clone，checkout 固定 route commit，根据固定
ground-truth commit 重新计算 changed-file oracle，明确建立索引，顺序执行两次
evaluate，检查路线必须与 oracle 完全一致，并确认 tracked worktree 清洁。只有
`EAGAIN`、`ENOMEM` 与 `ETIMEDOUT` 可以触发重试，而且每次尝试都会记录。完整
成功执行没有使用任何重试。

## 最终汇总

| 目标 | 通过 | Trials | 任务类型匹配 | 路线确定 | Oracle 文件 | 路线文件 | Macro coverage | Macro focus | Macro precision | 最大 context |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 | 8 | 16/16 | 16/16 | 8/8 | 16 | 16 | 1.00 | 1.00 | 1.00 | 4,844 |

十四次 trial 被保守地判为 underconfident，两次为 well-calibrated，没有
overconfident trial。最大 context 只证明没有超过协议中的 6,000-token 上限。

## 各目标前后比较

| 目标 | 修复前 coverage / focus | 修复后 coverage / focus | 最终任务类型 | 最终精确路线 |
| --- | ---: | ---: | --- | --- |
| Koa | 0.00 / 0.00 | 1.00 / 1.00 | bugfix | `lib/response.js`；`__tests__/application/response.test.js` |
| Starlette | 0.50 / 0.33 | 1.00 / 1.00 | feature | `starlette/requests.py`；`tests/test_requests.py` |
| Gin | 1.00 / 1.00 | 1.00 / 1.00 | bugfix | `context.go`；`context_test.go` |
| Tower | 0.50 / 0.25 | 1.00 / 1.00 | bugfix | `tower/src/balance/p2c/service.rs`；`tower/src/balance/p2c/test.rs` |
| Axios | 1.00 / 1.00 | 1.00 / 1.00 | bugfix | `lib/helpers/progressEventReducer.js`；`tests/unit/helpers/progressEventReducer.test.js` |
| Echo | 1.00 / 1.00 | 1.00 / 1.00 | bugfix | `middleware/static.go`；`middleware/static_test.go` |
| serde_json | 1.00 / 0.50 | 1.00 / 1.00 | feature | `src/raw.rs`；`tests/test.rs` |
| Pydantic | 1.00 / 0.22 | 1.00 / 1.00 | feature | `pydantic/networks.py`；`tests/test_networks.py` |

Confidence 保持保守：Koa `0.31`、Starlette `0.77`、Gin `0.75`、Tower
`0.85`、Axios `0.84`、Echo `0.61`、serde_json `0.69`、Pydantic `0.73`。
每个目标的两次执行都返回相同路线、confidence 与 calibration 状态。

## 新增通用机制

1. `Allow` 等有限范围的祈使 feature 动词会把任务识别为 feature，但不会因此
   成为强文件身份。
2. 保留明确代码身份作为路由证据，包括 `Request.cookies` 这样的 dotted
   receiver。
3. 即使 Markdown parser 产生类似代码的 symbol，说明文件也不能伪装成实现候选。
4. 使用 receiver、结果描述、测试标题与路径证据区分 request-side 和
   response-side 行为。
5. 当 colocated module test 或 `__tests__` 镜像路径与已选实现关系更强时，优先于
   泛化 integration test。
6. 实现与测试的版本范围必须一致；明确要求 v1 才选择 v1，未指定版本则优先当前
   模块。
7. feature 与强 unknown 任务同样使用 evidence-sufficient stopping；
   `routeLimit` 是上限，不是必须填满的配额。
8. 当 implementation-test 关系不存在或有歧义时，主动限制 confidence。

产品规则没有写入仓库名称、目标 commit 或目标专用路径。

## 索引性能警告

第一次回归执行在 Pydantic 新鲜索引超过 180 秒后停止。完整重跑中，同一个新鲜
索引仍花了 `127.940` 秒，随后两次路线试验都通过。另一次使用已有索引 checkout
的诊断 evaluate 花了 `8.778` 秒。

这把路线正确性与运行限制区分开来：大型 Python 仓库的索引仍然偏慢，而且对机器
负载敏感。成功重跑可以用于判断正确性，但不能抹掉超时记录，也不能授权速度声明。
后续仍需进行索引 profiling 与增量索引验证。

## 剩余限制

产品修改完成后，Vertex Palace 对五个实际产品改动文件进行了一次自评，只命中
三个文件，changed-file coverage 与 focus 都是 `0.60`，遗漏
`analyze-task.ts` 与生成的 plugin bundle。它不是正式目标，而是已公开的宽范围
开发诊断；但这说明“单一聚焦任务精确命中”仍不等于“复合产品修改的多表面完整
召回”。

完成研究资料后，同一个限制表现得更明显。路线
`route_d5fcbc3583b09f8a` 只命中 `2/7` 个实际文件，changed-file coverage
为 `0.29`、route focus 为 `0.22`、confidence 为 `0.59`，校准结果仍是
overconfident。它偏向六个旧的第二轮／第三轮 harness，再加入当前 harness、
未完成证据与无关 telemetry test；却遗漏成功证据、两份当前报告、完整性测试与
`package.json`。

这次递归自评会被记录，而不是立刻继续调参。若每写一份新报告就针对其文件名优化，
只会把仓库内部 artifact 名称逐步变成开发答案，不能建立泛化证据。

因此 Palace 仍必须保持 advisory。当前代码、测试、Git diff、build 输出与 runtime
证据始终高于路线建议。

## 晋级决定

候选版本通过第三轮已公开失败回归，但不能直接进入 Agent A/B，也不能追溯改变
第三轮 held-out 失败结论。

下一道门槛必须在对任务执行任何 Palace route 或人工检查前，机械选择并预注册
第四批仓库。候选 commit、任务列表、Git oracle、harness、重试规则与晋级门槛都
要先冻结。只有新的 untouched 静态路由结果通过，才可以开始顺序执行 Control、
Adaptive 与 Full Palace Agent 实验。
