# Held-out 跨仓库路由协议（0.4 Alpha，第三轮）

## 状态

本协议在机械目标选择之后完成预注册，也早于候选版本 `6060e0c` 对任何选中任务执行 route、evaluate、index 或 pack。必须先提交本协议和 `scripts/verify-held-out-cross-repository-routing-round-3.cjs`，才能进行第一次正式观察。

## 冻结输入

- 产品候选版本：`6060e0c6aa2aea64d0145c1e55bccdc4669e4b48`
- Selector commit：`a9f5ff2e22a7cd41ed6f019f75c9759500ecce09`
- Target manifest commit：`d35ff810c79c3374ce5b37d780138def50d3c52d`
- Target manifest：`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-3.json`
- Target manifest SHA-256：`16D62D36341E22864DED89CB7A8C2CC6C5D765C0C4F8B6AE237CFC4D5F0E1DC2`
- 本协议前针对选中任务的 Palace 调用：`0`

产品路径与 manifest 不得变化。只有在 build 能重现已提交 generated bundle 且不产生 tracked diff 时，才允许执行 build。

第一次前台 selector 执行在没有 stdout、stderr、manifest 或 finally 清理的情况下结束。保留的临时目录与执行宿主中断相符，但无法证明确定原因。该事件保存在 `docs/research/evidence/held-out-routing-target-selection-round-3-environment-interruption.json`。恢复过程使用完全相同的已提交 selector、pinned pool、候选版本和 create-only 输出路径；没有人工检查、替换或路由任何任务。

## 机械选择的目标

Expected task type 已由 selector 在 Palace 接触前推导并冻结于 manifest。

| 仓库 | 预期类型 | Route commit | Ground truth | 任务 | Changed files |
| --- | --- | --- | --- | --- | --- |
| Koa | bugfix | `4b12945e2e5dac698b6d3835e1a81415aed7ab26` | `480a4f064a4e8edb9e09be39355b3228ae4f4f9e` | `fix: response content-type value amount as one with testcase (#1899)` | `__tests__/application/response.test.js`；`lib/response.js` |
| Starlette | feature | `f617177ab955f7e79e0d863a7c28adb6200b4acc` | `7f78881448d06ac2b296fc3533abbb0148fb9402` | ``Support multiple cookie headers in `Request.cookies` (#3029)`` | `starlette/requests.py`；`tests/test_requests.py` |
| Gin | bugfix | `da1e108614ecbbadfa5736b1b297b16121d23b9b` | `d9307dbcbbe796a64d9e0ef23452da888dd7f904` | `fix(context): skip chmod on pre-existing dirs in SaveUploadedFile (#4702)` | `context.go`；`context_test.go` |
| Tower | bugfix | `251296dc54a044383dffd16d2179b443e2615672` | `df06d70dbea345facbffb5881fe8647f53bf424d` | `fix(balance): clear cached P2C ready index after a discovery removal (#874)` | `tower/src/balance/p2c/service.rs`；`tower/src/balance/p2c/test.rs` |
| Axios | bugfix | `02c2c4f891d76b15712a9edd149a2d9f7978774f` | `3d253b4f17a5107e6f274ee5b2e96e03508dceb2` | `fix: clamp negative progress values (#11039)` | `lib/helpers/progressEventReducer.js`；`tests/unit/helpers/progressEventReducer.test.js` |
| Echo | bugfix | `34f3f425100f94b500ced2e8799470e32bba877e` | `48128ab391f2ec9ea9679d59a472a97edaa08160` | `fix(static): preserve matched handler 404s` | `middleware/static.go`；`middleware/static_test.go` |
| serde_json | feature | `827a315bf2198558f0325b07bcc1e2cd973aba2f` | `cf16f75d81e28c723323bfc60a68fc02d2994fff` | `Add RawValue::from_string_unchecked` | `src/raw.rs`；`tests/test.rs` |
| Pydantic | feature | `92208bf84df18f606df8c69f7043b4cc0673e34c` | `be3e4d174d2a429a31a36ba79530f299c367590f` | ``Allow periods in unquoted `NameEmail` display names (#13206)`` | `pydantic/networks.py`；`tests/test_networks.py` |

Harness 会在调用 Palace 前，直接从 Git 验证每个 subject、expected type、parent 关系和完整 changed-file diff。

## 执行方式

每个仓库都会在 route commit 建立全新副本。冻结 CLI 先执行 init 与显式 index，再顺序执行两次 trial。每次 trial 都依次执行 `evaluate` 和 `context --auto`：

- budget：6,000 estimated input tokens；
- route limit：9 个文件；
- maximum drawers：4；
- 第一次 evaluate 位于显式 index 之后，随后操作使用 warm index；
- 不并发执行目标或重复试验。

因此正式观察包含八个目标与 `16` 次顺序 trial。

## 晋级门槛

只有全部条件成立才算通过：

- 八个目标都完成两次 trial；
- 每个实际 task type 都符合 manifest 机械冻结的 expected type；
- 每个目标都路由全部声明的实现与聚焦测试文件；
- macro changed-file coverage 至少 `0.90`；
- macro route focus 与 precision 均至少 `0.75`；
- 任一目标的 route focus 或 precision 都不能低于 `0.50`；
- 两次重复的 route files 完全一致；
- calibration 不得为 `overconfident`；
- context 不超过 6,000 estimated tokens；
- selected 与 excluded boundary 不重叠；
- 显式 index 后 status 为 fresh；
- Palace 不得修改仓库 tracked 文件。

Environment/setup、harness-contract 与 product/contract 失败分开记录，但任何一种都会阻止晋级。不得替换目标，也不得覆盖失败输出或在修改候选版本后静默重跑。

## 证据保存

第一次正式观察只能以 create-only 方式写入：

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3.json`

Harness 拒绝覆盖现有结果。开始解释或产品修复前，必须先原样提交 raw evidence 并计算 hash。

## 声明边界

通过只支持这批语言平衡的八目标样本上的 held-out 静态路由泛化，不能证明最终 Agent 正确率、reported Token 减少、wall time 降低或工具调用减少。失败会阻止进入 Agent A/B，并将八个任务全部转为已公开开发数据。

## 命令

只能在本协议和验证 harness 提交后执行：

```powershell
node scripts/verify-held-out-cross-repository-routing-round-3.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3.json
```
