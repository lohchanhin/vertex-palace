# 本地盲测路由第 19 轮结果（0.4 Alpha）

## 结果边界

修正后的 Attempt 2 完成八组静态配对目标，没有环境或 harness 失败。Candidate **没有通过**冻结的绝对门槛，因此**不能晋级** Agent A/B。

Attempt 1 因通用 commit-message 契约错误，在暴露七组目标后被永久保存为无效。Attempt 2 沿用完全相同的 candidate、baseline、目标、整文件 oracle、门槛与执行顺序；对七个目标而言，它不是全新的第一次观察，而且两次之间没有调整产品。

本研究只测量静态证据路由，不能证明 Agent 正确率、端到端 Token 节省、Agent 工具调用减少或 Agent 执行时间下降。

## 汇总结果

| 指标 | Baseline | Candidate | Candidate - Baseline |
|---|---:|---:|---:|
| 完整 trials | 16 | 16 | 0 |
| 任务类型正确 | 8/8 | 8/8 | 0 |
| 实现与 focused test 全部完整 | 5/8 | 4/8 | -1 |
| 精确 oracle 目标 | 2/8 | 2/8 | 0 |
| Target-macro changed-file coverage | 0.646 | 0.667 | +0.021 |
| Target-macro route focus | 0.460 | 0.484 | +0.024 |
| Calibration 平均绝对误差 | 0.541 | 0.440 | -0.101 |
| 过度自信 trials | 4 | 2 | -2 |
| Unsafe narrow-mode trials | 2 | 0 | -2 |
| 平均 context estimated Tokens | 2,075.375 | 2,779.125 | +703.750 |
| 静态命令总时间 | 33.934 秒 | 38.054 秒 | +4.120 秒 |

Candidate 在 coverage、focus、narrow-mode 安全和 enforced-stop 安全上都没有劣于 baseline，但相对改善不足以通过绝对证据门槛；payload 与静态时间都增加。

## Candidate 逐目标图谱

| 目标 | Coverage | Focus | Core 完整 | 主要缺口 |
|---|---:|---:|:---:|---|
| `cors` | 0.333 | 0.500 | 否 | 根级测试与 `HISTORY.md` |
| `hoek` | 0.000 | 0.000 | 否 | `clone` 实现与 focused test |
| `jaraco-path` | 1.000 | 0.250 | 是 | Ruff 相关扩散过广 |
| `iniconfig` | 1.000 | 1.000 | 是 | 无 |
| `pretty` | 1.000 | 1.000 | 是 | 无 |
| `groupcache` | 0.500 | 0.500 | 否 | `consistenthash` 嵌套实现 |
| `semver` | 1.000 | 0.375 | 是 | parser 与 fuzz support 过多 |
| `cc-rs` | 0.500 | 0.250 | 否 | 仓库根级测试文件 |

只有 `iniconfig` 与 `pretty` 通过完整的逐目标门槛。所有 candidate 路由都保持确定性，显式 index 全部 fresh，没有修改目标仓库 tracked 文件，evaluate 与 context 路由完全一致。

## 已经改善的方面

1. **安全性：**candidate 消除了 baseline 的两次 unsafe narrow mode。
2. **指标一致性：**candidate 每次报告的 coverage、focus 都与独立重算一致；baseline 有四次不一致。
3. **校准：**平均绝对误差下降 0.101，过度自信从四次降到两次。
4. **检索：**aggregate coverage 与 focus 小幅增加，并在 `cc-rs` 找回 `src/lib.rs`。

## 仍然失败的方面

1. **词形锚点：**`cloning` 没有稳定锚定 `clone.js`，导致 `hoek` 完全命错。
2. **根级 focused tests：**`cors` 和 `cc-rs` 找到实现，却没有闭合到通用根级测试文件。
3. **嵌套 owner：**`groupcache` 的通用注释质量任务没有进入 `consistenthash/consistenthash.go`。
4. **辅助证据：**唯一预先登记的 auxiliary `HISTORY.md` 未命中。
5. **扩散控制：**广泛 lint/parser 任务虽然覆盖完整，却带入过多 support，降低 focus 并增加 payload。
6. **残余过度自信：**`hoek` 两次都是零 oracle coverage，但 confidence 仍为 0.40。

## 后续产品方向

观察后研发必须把全部 Round 19 目标视为已披露回归案例，而且修复必须保持仓库通用：

1. 归一化词形锚点，包括双写辅音与 silent-`e`，例如 `cloning -> clone`；
2. 以索引中的 import、call 与路径证据，加强实现到根级或惯例测试聚合器的 focused-test 闭环；
3. 当任务描述代码质量面而非具体文件时，为嵌套 package 增加 owner/module 闭环；
4. 先覆盖实现与 focused verification，再在固定预算内补充 changelog 辅助证据；
5. 证据闭环后剪除多余 support，让完整路由变小，而不是只会变大；
6. 缺少独立实现锚点或 focused verification 路径时，进一步限制 confidence。

比赛冻结仍有效，因此不能公开更新 Git、npm、Devpost 或影片。
