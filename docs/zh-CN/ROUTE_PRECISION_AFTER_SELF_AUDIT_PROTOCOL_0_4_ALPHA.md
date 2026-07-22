# 0.4 Alpha 自审修复后路由精度协议

状态：预注册回归协议。提交本协议时，尚未观察这里定义的候选版本执行结果。

## 研究问题

产品提交 `543a670ff06d65d8df3fe6d63f0915918812aaaf` 的路由与 freshness 修复，能否在保留既有跨仓库路线的同时，修复 Vertex Palace 中英文六件研究资料自审，以及生成产物导致索引永久 stale 的问题？

## 结论边界

这是已见目标的回归研究。Zod、Requests、p-limit 和 Vertex Palace 研究资料都曾影响本轮研发。通过只能证明候选版本与这些冻结目标兼容，不能证明面对全新仓库的泛化能力，也不能证明 Agent Token、执行时间或任务成功率有所改善。

## 候选版本冻结

- 产品提交：`543a670ff06d65d8df3fe6d63f0915918812aaaf`
- 执行器：`scripts/verify-route-precision-after-self-audit.cjs`
- 执行器会把自身 Git commit 写入证据文件。
- build 前后，产品源码、套件、构建配置、lockfile 和生成的 MCP bundle 都必须与产品提交一致。
- 历史执行器、协议和首次证据文件不得修改或覆盖。

## 跨仓库目标

外部仓库、任务、changed-file oracle 与可接受路线边界，全部沿用首次复制实验。

| 仓库 | 路由提交 | Changed-file oracle | 可接受路线边界 |
| --- | --- | --- | --- |
| Zod | `912f0f51b0ced654d0069741e7160834dca742ee` | `packages/zod/src/v4/core/schemas.ts` 与聚焦的 discriminated-union 测试 | 仅这两个文件 |
| Requests | `f361ead047be5cb873174218582f7d8b9fcd9f49` | `src/requests/sessions.py` 与 `tests/test_requests.py` | 仅这两个文件 |
| p-limit | `c944e4a4363ff41a7202d5dec346cc174c3ecf49` | 与 `ccb80b2721a6a4a27ce5ad7721fe939162a35b31` 的真实 Git diff | `index.d.ts`、`index.test-d.ts` 与 `package.json` |

## 中英文自审

执行器会把 Vertex Palace 克隆到冻结的产品提交，并将冻结 build 产生的 `dist/palace.cjs` 复制进克隆仓库，作为被 ignore 但已声明的生成产物。之后先执行 `init`、`index`、`status`，再观察任何路线。

英文任务与等价的简体中文任务都必须找齐以下六件资料：

1. `scripts/verify-route-precision-cross-repositories.cjs`
2. `docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md`
3. `docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_PROTOCOL_0_4_ALPHA.md`
4. `docs/research/evidence/cross-repository-route-precision-0.4-alpha.json`
5. `docs/research/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md`
6. `docs/zh-CN/CROSS_REPOSITORY_ROUTE_PRECISION_RESULT_0_4_ALPHA.md`

由于任务中的“冻结协议”明确要求配置表面，`tsconfig.base.json` 是唯一额外允许进入路线的文件，但不计入 changed-file coverage。

## 执行方法

- 在当前仓库 build 一次冻结候选版本。
- 把每个外部目标按固定 commit 克隆到全新的系统临时目录。
- 每个外部目标执行两轮 `evaluate`，随后执行 `context --auto`。
- 把 Vertex Palace 按产品提交克隆到临时目录。
- 明确初始化并索引自审克隆仓库，只观察一次即时 status。
- 中英文自审各执行两轮 `evaluate`，随后执行 `context --auto`。
- 全程使用预算 `6000`、route limit `9`、max drawers `4`。
- 命令失败、JSON 解析失败、初始化失败与部分完成 trial 都必须写进证据。
- 不得修改任何目标仓库的 tracked files。

## 冻结门槛

每个外部仓库都必须满足：

1. 两轮 trial 完整执行。
2. Changed-file coverage 为 `1.00`。
3. 可接受边界 precision 为 `1.00`。
4. 两轮路线文件完全一致。
5. 没有 overconfident 路线。
6. Context 不超过 6000 estimated tokens。
7. selected 与 excluded 边界没有重叠。
8. tracked worktree 保持干净。

英文和简体中文自审还必须各自满足：

1. 六件资料的 changed-file coverage 为 `1.00`。
2. Route focus 至少 `0.75`。
3. 路线文件不超过 `8` 个。
4. 可接受边界 precision 为 `1.00`。
5. 两轮路线文件完全一致。
6. 没有 overconfident 路线。

明确索引完成后的即时 status 必须是 `stale: false`。

## 证据保存

固定执行命令：

```powershell
node scripts/verify-route-precision-after-self-audit.cjs --out docs/research/evidence/route-precision-after-self-audit-0.4-alpha.json
```

证据路径为必填，并采用仅新建写入。若要重试必须使用其他路径，因此首次观察无法被覆盖。

## 决策规则

若通过，候选版本只进入下一道静态门槛：在路由前选择并预注册一个真正未曾出现的仓库与真实历史任务。若失败，失败结果仍要永久保留，只能诊断原因，不能回头修改本协议门槛。
