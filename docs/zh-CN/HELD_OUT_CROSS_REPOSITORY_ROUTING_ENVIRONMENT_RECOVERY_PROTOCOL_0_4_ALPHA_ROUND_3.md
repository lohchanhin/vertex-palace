# Held-out 路由环境恢复协议（0.4 Alpha，第三轮）

## 状态

本协议在原样保存第三轮第一次观察之后完成预注册，也早于任何被删失目标的重新执行。必须先提交本协议与 `scripts/verify-held-out-cross-repository-routing-round-3-environment-recovery.cjs`，才能开始环境恢复。

## 为什么必须是独立研究

原始 create-only 观察继续保持 failed，文件为 `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3.json`。

- Koa 完成两次 trial，得到真实产品失败：oracle coverage、focus 与 precision 都是 0，并且两次都 overconfident。
- Starlette 在 Git 传输时连接被重置。
- Gin、Tower、Axios、Echo、serde-json（`serde_json`）与 Pydantic 在 Palace 执行前因为 GitHub DNS 解析失败。

只有 Koa 形成产品证据，其他七个观察属于环境删失。本补充研究只补齐缺失观察，不改变原始状态、不删除 Koa 失败，也不会把第一次研究包装成通过。

## 冻结输入

- 产品候选版本：`6060e0c6aa2aea64d0145c1e55bccdc4669e4b48`
- Selector commit：`a9f5ff2e22a7cd41ed6f019f75c9759500ecce09`
- Manifest commit：`d35ff810c79c3374ce5b37d780138def50d3c52d`
- Manifest SHA-256：`16D62D36341E22864DED89CB7A8C2CC6C5D765C0C4F8B6AE237CFC4D5F0E1DC2`
- 原始观察 commit：`2964abf4c7f8b5745e8daa636ac2a58a37b662c0`
- 原始观察 SHA-256：`7C1C0731008979D1DD3085EAEC86A43F277E3BFE588C86D43D5E11AFA5BD7EDF`
- 两次观察之间的产品改动：`0`

Harness 会在 build 或访问目标前验证所有 commit 与 hash。

## 精确恢复集合

只有原始观察中属于 `environment-or-setup` 且 trial 数为 0 的七个目标可以执行：

1. Starlette
2. Gin
3. Tower
4. Axios
5. Echo
6. serde-json（`serde_json`）
7. Pydantic

Koa 不重跑。不得替换目标、任务、仓库、commit、oracle、budget、route limit、drawer limit 或指标。

## Materialization 恢复

每个目标最多执行三次 materialization attempt。每次都先移除不完整的目标目录，再重新获取完全相同的冻结 route commit 与 ground-truth commit。所有失败 attempt 和错误都会记录；attempt 之间固定等待 5,000 ms。

重试只发生在 Palace 执行前。目标一旦成功 materialize，就严格执行原来的两次顺序 Palace trial，不增加额外 trial。

## 不变的评估方式

每个恢复目标继续使用：

- 显式 `init` 与 `index`；
- 依次执行 `evaluate` 与 `context --auto`；
- 两次顺序 repetition；
- 6,000 estimated-token budget；
- route limit 9；
- 最多 4 个 drawer；
- 相同的实现/测试 oracle、task-type oracle、coverage、focus、precision、calibration、determinism、context、cleanliness 与 boundary 检查。

Recovery 输出会针对七个观察得到独立 pass/fail 状态。即使七个全部通过，原始第三轮仍然是 failed；由于 Koa 的产品失败保持冻结，候选版本仍不能进入 Agent A/B。

## 证据保存

补充观察只能 create-only 写入：

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3-environment-recovery.json`

Harness 会拒绝覆盖。任何产品修复前必须先原样提交 raw evidence 并计算 hash。

## 声明边界

本研究可以在候选版本不变的前提下补齐缺失的 held-out 静态路由观察，但不能追溯修改原始协议结果、不能证明 Agent 正确率，也不能支持 Token、wall time 或工具调用改善声明。

## 命令

只能在本协议与 recovery harness 提交后执行：

```powershell
node scripts/verify-held-out-cross-repository-routing-round-3-environment-recovery.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-3-environment-recovery.json
```
