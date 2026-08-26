# 本地盲测路由第 20 轮结果（0.4 稳定版门槛）

## 结果边界

第 20 轮是一次全新、公开预注册的静态路由比较，比较 npm 公共包 `vertex-palace@0.3.0` 与 `vertex-palace@0.4.0-alpha.1`。仓库池、公共包哈希、整项语义审核、八项目标 manifest、执行顺序、预算与判定阈值，都在对选中任务调用 Palace 之前提交到 GitHub。

本轮没有 validity、环境、setup 或 harness-contract 失败。Candidate **没有通过冻结的绝对门槛**，**不能晋级 Agent protocol**，也**不能取代 npm `latest`**。

本研究只测量静态证据路由，不能证明 Agent 正确率、端到端 Token 节省、Agent 工具调用减少或 Agent 执行时间改善。

## 汇总结果

| 指标 | `0.3.0` baseline | `0.4.0-alpha.1` candidate | Candidate - baseline |
|---|---:|---:|---:|
| 完整 trials | 10/16 | 14/16 | +4 |
| 任务类型正确 | 5/8 | 7/8 | +2 |
| 实现与 focused test 完整 | 1/8 | 3/8 | +2 |
| 通过完整目标门槛 | 0/8 | 3/8 | +3 |
| 精确 oracle 目标 | 0/8 | 1/8 | +1 |
| Target-macro changed-file coverage | 0.497 | 0.655 | +0.158 |
| Target-macro route focus | 0.337 | 0.579 | +0.242 |
| Calibration 平均绝对误差 | 0.301 | 0.442 | +0.141 |
| 过度自信 trials | 4 | 2 | -2 |
| Unsafe narrow-mode trials | 4 | 0 | -4 |
| 指标不一致 trials | 4 | 0 | -4 |
| Evaluate/context 边界不一致 trials | 2 | 0 | -2 |
| 平均 context estimated Tokens | 1,158.400 | 2,798.714 | +1,640.314 |
| 静态命令总时间 | 33.562 秒 | 51.150 秒 | +17.588 秒 |

Candidate 在 coverage、focus、任务分类与建议安全性上都有明显相对改善，也消除了所有指标边界不一致。但这些改善仍没有达到预注册的绝对要求：宏观 coverage `0.90`、宏观 focus `0.70`、所有重复完整、核心与辅助面完整，以及零过度自信。

## Candidate 逐目标图谱

| 目标 | Coverage | Focus | Core 完整 | 结果 | 主要缺口 |
|---|---:|---:|:---:|:---:|---|
| `mimic-fn` | 0.500 | 1.000 | 否 | 失败 | `index.d.ts` 与 `readme.md` |
| `is-unicode-supported` | N/A | N/A | 否 | 失败 | context 没有返回 Primary candidate |
| `pyupgrade` | 0.000 | 0.000 | 否 | 失败 | 路由到通用 string helpers，没有进入指定 typing plugin |
| `add-trailing-comma` | 1.000 | 0.667 | 是 | 通过 | 无 |
| `conc` | 0.750 | 0.429 | 否 | 失败 | `pool/context_pool_test.go` |
| `termenv` | 1.000 | 0.625 | 是 | 通过 | 无 |
| `backtrace-rs` | 0.333 | 0.333 | 否 | 失败 | `src/symbolize/gimli.rs` 与 `tests/accuracy/main.rs` |
| `tempfile` | 1.000 | 1.000 | 是 | 通过 | 无 |

所有显式索引都是 fresh，没有修改目标仓库 tracked 文件，没有 selected/excluded 重叠；所有完成的 candidate 路由都具有确定性。每个完成的 candidate trial 中，evaluate 与 context 的边界也完全一致。

## 已经改善的方面

1. **建议行为更安全：**unsafe narrow mode 从四次降为零。
2. **检索更好：**宏观 coverage 增加 `0.158`，宏观 focus 增加 `0.242`。
3. **任务处理更完整：**完整 core surface 从一个目标增加到三个；candidate 有三个目标通过完整门槛，baseline 为零。
4. **指标一致：**candidate 报告的 coverage/focus 与独立重算一致，evaluate/context 也选择相同边界。
5. **精确案例成立：**`tempfile` 精确命中两个 oracle 文件；`termenv` 的跨文件 writer 重构找回全部五个 changed files。

## 仍然失败的方面

1. **No-primary 契约：**合法任务仍可能让 context 没有 Primary candidate。两个产品都因此无法完成 `is-unicode-supported`；baseline 在 `add-trailing-comma` 与 `conc` 也出现同类失败。
2. **指定模块解析：**`pyupgrade` 过度重视通用 `string` 锚点，错过明确相关的 `typing_pep563` 实现与测试。
3. **声明与文档闭环：**`mimic-fn` 找到 runtime 实现和测试，却遗漏相邻 TypeScript declaration 与预注册 README。
4. **同级 focused-test 闭环：**`conc` 找到两个实现文件，但只找回两个 focused tests 中的一个。
5. **平台 owner 闭环：**`backtrace-rs` 找到一个 Apple 测试，却遗漏中央 `gimli` 实现与第二个 accuracy test。
6. **残余过度自信：**完成的 candidate trials 中仍有两次过度自信，包括一次 confidence `0.53` 但 coverage 为零。
7. **Payload 成本：**candidate 的平均静态 context 估算约为 baseline 的 2.4 倍，静态命令时间多 52%。

## 稳定发布决定

预注册的稳定发布结论是 **NO-GO**。npm 必须维持：

- `latest`: `0.3.0`
- `next`: `0.4.0-alpha.1`

在这个结果之后把 `0.4.0` 发布到 `latest`，会违反观察前已经公开提交的决定规则。

## 后续产品方向

第 20 轮现在属于已披露回归证据。观察后的研发必须保持仓库通用：

1. 当无法证明 Primary candidate 时，仍返回结构化 advisory response，而不是让 context 契约失败；
2. 让明确模块名与路径派生锚点优先于通用词汇匹配；
3. 先建立 primary implementation anchor，再进行有界的 declaration、documentation 与同级 test 闭环；
4. 用索引中的路径、symbol 与 dependency 证据增加平台与配置 owner 闭环；
5. 用独立重算的 coverage 信号限制 confidence；没有 implementation anchor 时必须维持低 confidence；
6. 证据闭环后缩小 payload，在保留完整 surface 的同时剪除不相关 support。

未来若要尝试稳定发布，必须建立新的公开冻结仓库池并执行 held-out 第 21 轮。第 20 轮目标可以用于回归研发，但不能再作为全新确认性证据。

## 证据

- [研究协议](../research/LOCAL_BLIND_ROUTING_VALIDATION_PROTOCOL_0_4_STABLE_ROUND_20.md)
- [公共产品冻结](../research/evidence/local-blind-candidate-freeze-0.4-stable-round-20.json)
- [目标 manifest](../research/evidence/local-blind-routing-target-manifest-0.4-stable-round-20.json)
- [验证冻结](../research/evidence/local-blind-routing-validation-freeze-0.4-stable-round-20.json)
- [不可变结果](../research/evidence/local-blind-routing-validation-0.4-stable-round-20.json)

不可变结果 SHA-256：`AEF391A3FF7CBF918F3856DBAEF698DCD41074EBEA667626B55C6D63DCD38D58`。
