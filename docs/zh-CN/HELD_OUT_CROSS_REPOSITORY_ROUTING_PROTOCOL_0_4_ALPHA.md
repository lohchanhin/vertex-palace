# 未见跨仓库路由协议（0.4 Alpha）

## 状态

本协议在机械选题完成后、冻结候选第一次路由任何选中任务之前预注册。协议与验证脚本必须先提交，之后才能执行第一次正式观察。

## 冻结输入

- 产品候选：`0b6a0fd92f43a74c983663cd32f937087e3ec923`
- 目标 manifest commit：`b91dbd14a69f92fa84fa9f4175b1c3c33bd6d342`
- 目标 manifest SHA-256：`5B071471BCF1B049B9BF1A2C70F536F138557A83AC6BCCDAA9AB9A82906A84C6`
- Selector commit：`2be2dc11673fbdf23112a420048af3a2a27914fb`
- 选题期间 Palace 调用次数：`0`

本研究期间，产品路径与目标 manifest 都不可变更。

## 机械选中的目标

| 仓库 | Route commit | Ground truth | 任务 | 改动文件 |
| --- | --- | --- | --- | --- |
| Fastify | `ab9b96eb2f93373949c253933eddb46f6772bbf4` | `6682c4f9a76cbb60c372ba5cad9dd2fc6e2fdb51` | `fix: normalize method in findRoute (#6838)` | `lib/route.js`；`test/find-route.test.js` |
| Click | `e0d1678ebc10cc663f2bc1973e0399b31415f8db` | `d15f3c23a177e80c324e1ee9681c9449c31ac965` | `fix: Skip flaky pager test on macOS with free-threaded Python 3.14t` | `src/click/_compat.py`；`tests/test_utils.py` |
| Cobra | `f2878bab8c96afd6e36968af96343b35dbb82a82` | `746ef07158728502482cea9f880a6f4b21ef29a9` | `fix: prevent completions from mutating os.Args via append side effect (#2356)` | `completions.go`；`completions_test.go` |
| Marked | `a37983f188d697fe98d350554dc95c49eaac6edd` | `11adb697eeee2b0fa6da3a38d5146626347592dc` | `fix: fix cli not reading stdin (#3967)` | `bin/main.js`；`test/unit/bin.test.js` |

验证脚本会在调用 Palace 前，直接从 Git 核对每个 commit subject、parent 关系和完整 changed-file diff。

## 执行方式

每个仓库 checkout 到 route commit。冻结 CLI 完成 init 与显式 index 后，连续执行两次 trial。每个 trial 依序运行 `evaluate` 和 `context --auto`：

- 预算：6,000 estimated input tokens；
- route limit：9 个文件；
- drawer 上限：4；
- 不并发执行；
- 第一次 evaluate 位于显式 index 后，其余操作使用 warm index。

## 晋级门槛

四个目标在两次重复中都必须满足：

- task type 为 `bugfix`；
- changed-file coverage 等于 `1.00`；
- route focus 至少 `0.75`；
- 相对于完整 Git diff 的 route precision 至少 `0.75`；
- 两次 route files 完全一致；
- calibration 不得为 `overconfident`；
- context 不得超过 6,000 estimated tokens；
- selected 与 excluded 边界不得重叠；
- 显式 index 后 status 必须为 fresh；
- Palace 不得修改 tracked repository files。

准备或网络失败记录为 `environment-or-setup`，不能当成产品结果，但在另行预注册重跑政策前仍会让整体研究无法通过。路由或契约失败记录为 `product-or-contract`。观察后不得替换目标。

## 证据保存

第一次正式观察必须建立在：

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha.json`

验证脚本使用排他建立模式，拒绝覆盖既有结果。原始证据必须先原样提交并计算哈希，之后才能写结果报告。

## 声明边界

这是候选 `0b6a0fd` 第一次面对未参与研发的仓库与任务所产生的静态路由观察。通过只支持 held-out 静态路由泛化，不能证明 Agent 正确率、Token 节省或执行时间改善。

## 执行命令

只有在本协议与 `scripts/verify-held-out-cross-repository-routing.cjs` 已提交后才能执行：

```powershell
node scripts/verify-held-out-cross-repository-routing.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha.json
```

