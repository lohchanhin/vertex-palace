# 未见跨仓库路由验证协议（0.4 Alpha，第二轮）

## 状态

本协议在机械选择目标后、候选版本 `0ef19a7` 对任何选中任务执行路线前预注册。必须先提交本协议与 `scripts/verify-held-out-cross-repository-routing-round-2.cjs`，才能产生第一次正式观察。

## 冻结输入

- 产品候选版本：`0ef19a7bbef1901d813b81389405f87482db47c5`
- 选择器 commit：`0f3a8bc13c9de670cc4f3caf880f3bfb6b744bc2`
- Target manifest commit：`4dfdf420fe56d397946e6f7920528697f1cd9629`
- Target manifest：`docs/research/evidence/held-out-routing-target-manifest-0.4-alpha-round-2.json`
- Manifest SHA-256：`694BF80DDB45A381F19FCA993674A71EA5BA78EB963258E3A2675C416D3B09A8`
- 本协议前对选中任务的 Palace 调用：`0`

产品路径与 manifest 都不可修改。只有在生成产物与 commit 完全一致、不产生 tracked diff 时，才允许执行 build。

## 预注册勘误

选择协议正确允许 `fix`、`feat` 与 `add` 行为 subject，但验证摘要误写成所有任务都必须保持 `bugfix`。机械选择后的 manifest 因此同时包含 fix 与 feature subject。

本勘误在任何选中任务调用 Palace 前冻结，没有删除、替换或使用 Palace 检查任何目标。Expected task type 只依未经修改的 subject prefix 机械决定：

- `fix:` -> `bugfix`
- `feat(...):` 或 `Add ...` -> `feature`
- 未知或不匹配的分类使研究失败

## 机械选择的目标

| 仓库 | 预期类型 | Route commit | Ground truth | 任务 | Changed files |
| --- | --- | --- | --- | --- | --- |
| Express | bugfix | `3e81873b52e107898ed7ba45874959fb0546df3f` | `6cd404eb28ff861180f435b3015f8d0c8c0b44d4` | `fix: enhance req.acceptsCharsets method (#6088)` | `lib/request.js`；`test/req.acceptsCharsets.js` |
| HTTPX | feature | `c3585a5ccfa57bec653f3846b8625a27d11dcd5e` | `88e84314378b31336027363af862619c519a4a3a` | `Add cookies to the retried request when performing digest authentication. (#2846)` | `httpx/_auth.py`；`tests/test_auth.py` |
| urfave/cli | bugfix | `f980ca84bf6559aa0571b213534b4d3b8d37f5d2` | `0045bbdaa06af2eba6c1a5d38907665fb2e839e3` | `fix: keep completion subcommand order deterministic in help output` | `completion.go`；`completion_test.go` |
| Clap | feature | `1565a3cbb411dedc410154fca0de7ec445fcdb08` | `ac0d148f7e21068fd1f544230456f30c95311f78` | `feat(complete): Index-aware ValueCompleter` | 两个 implementation；一个 testsuite 文件 |
| Commander | feature | `02c603ebedaec334ba9edc7c3c2e48484e2aeaf8` | `a8ef5cf3e1975380974ab5c4f92c26fb2c5e3209` | `Add informative message for missing executable on Windows (#2291)` | `lib/command.js`；两个 executable-subcommand tests |
| pytest | bugfix | `eb79044cea1c2c7b6e58ebcce17c55da871fef6c` | `fc8f56bd211128db4dd33b1a9ad42f50d9c8a3f8` | `fix: deduplicate Directory nodes on re-collection to preserve fixture identity (#14635)` | `src/_pytest/main.py`；`testing/test_conftest.py` |

Harness 会在调用 Palace 前，直接从 Git 验证每个 subject、parent 关系和完整 changed-file diff。

## 执行方式

每个仓库都会重新取得并 checkout 到 route commit。冻结的 CLI 先执行 init 与显式 index，再顺序运行两次 trial。每个 trial 依次执行 `evaluate` 和 `context --auto`，参数为：

- budget：6,000 estimated input tokens；
- route limit：9 个文件；
- maximum drawers：4；
- 第一次 evaluation 在显式索引后执行，后续为 warm-index；
- 不并发执行 trial。

## 晋级门槛

只有全部条件成立时才通过：

- 六个目标都完成两次 trial；
- 每个 task type 符合机械 prefix 映射；
- 每个目标都路由到全部声明的 implementation 与 focused test 文件；
- macro changed-file coverage 至少 `0.90`；
- macro route focus 与 precision 都至少 `0.75`；
- 没有单一目标的 focus 或 precision 低于 `0.50`；
- 两次执行的 route files 完全一致；
- 不得出现 `overconfident`；
- context 不超过 6,000 estimated tokens；
- selected 与 excluded boundary 不重叠；
- 显式 index 后 status 必须 fresh；
- Palace 不得修改 tracked repository files。

环境/setup、harness contract 和产品/contract 失败会分别记录。由于没有预注册 rerun 或替换政策，任何类别都会使正式研究失败。

## 证据保存

第一次正式观察只能以 exclusive create 写入：

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-2.json`

Harness 会拒绝覆盖既有结果。原始证据必须未经修改提交并哈希，之后才能撰写解释。

## 声明边界

即使通过，也只支持这六个样本的 held-out 静态路由泛化，不证明最终 Agent 正确率、reported Token 减少、wall time 降低或工具调用减少。若失败，则拒绝进入 Agent A/B，并将六个任务全部转为公开开发数据。

## 命令

只能在协议与 harness 提交后执行：

```powershell
node scripts/verify-held-out-cross-repository-routing-round-2.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-2.json
```
