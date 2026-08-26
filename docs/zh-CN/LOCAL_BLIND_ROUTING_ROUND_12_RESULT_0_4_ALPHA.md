# 本地盲测路由第 12 轮结果（0.4 Alpha）

## 结论

第 12 轮是一轮有效、完整、对 candidate 保持 held-out 的配对静态路由研究。八个目标与 32 次正式观察全部完成。修正后的正式运行没有环境/setup 失败、harness contract 失败、stale index、evaluate/context route 不一致、selected/excluded 重叠或目标 tracked worktree 修改。

Candidate 相对 pre-repair baseline 的 aggregate coverage、focus、calibration 与平均交付 payload 都有改善，但**没有通过冻结的绝对门槛**，不能进入端到端 Agent A/B。这只证明静态路由表现，不能证明 Agent 正确率、Token 节省、工具调用减少或执行时间下降。

## 证据完整性

- 修正后正式结果 SHA-256：`4A7D6DBB68FBD6C1AEA3CD3159A092E5C2E8D6931187533F827A55BA6B1529D3`
- Attempt-2 validation freeze SHA-256：`FB0F9E9F438B822FD98F9FDDF075A184B5807CB440D16A3C0199C33B6443841B`
- Target manifest SHA-256：`693B398DDB28682D535208AA87F4DDA07AE01F1B97B1BE970C103CED6B046486`
- Candidate freeze SHA-256：`D3B7BE55E1B80F964490A5E773E11AFCB97323A04E933AB30D131AAE6B48F406`
- Candidate queue SHA-256：`0B6CDDCD91C34DF7A30F57AC1CF1E3B99A1180982FC6B0DE56B45075433047C9`
- Semantic review SHA-256：`2F17D6551B4E24F1404811D1F757D2718F13E856B095DD0EE88B1E1FC7992FF0`

第一次正式命令因为验证器期待 validation-freeze attempt 2、第一份冻结却声明 attempt 1，而在任何目标物化、baseline build 或 Palace 调用前生成 create-only 无效结果。它以 SHA-256 `AC7725C8CFD70283D504E699FDE1570411142F1B4B5A68138D3C7F49900379F3` 原样保留。Attempt 2 只修正 harness identity 与 provenance；candidate 源码、任务、oracle、阈值、重复次数和条件顺序都没有改变。

## Aggregate 比较

| 指标 | Baseline | Candidate | 差值 |
| --- | ---: | ---: | ---: |
| 通过目标 | 3/8 | 3/8 | 0 |
| Core surface 完整 | 5/8 | 4/8 | -1 |
| Auxiliary 完整 | 0/2 | 0/2 | 0 |
| Target-macro changed-file coverage | 0.542 | 0.625 | +0.083 |
| Target-macro route focus | 0.542 | 0.563 | +0.021 |
| 最低单目标 coverage | 0.000 | 0.000 | 0 |
| 最低单目标 focus | 0.000 | 0.000 | 0 |
| Calibration 平均绝对误差 | 0.468 | 0.331 | -0.137 |
| Overconfident trials | 6 | 6 | 0 |
| Unsafe narrow-mode trials | 0 | 0 | 0 |
| Unsafe enforced-stop trials | 0 | 0 | 0 |
| Metric disagreement trials | 4 | 0 | -4 |
| 平均交付 context Tokens | 3,085.125 | 2,899.875 | -185.250 |
| 最大交付 context Tokens | 5,390 | 5,227 | -163 |
| 静态命令总时间 | 56.325 s | 57.762 s | +1.437 s |

相对结果方向偏正面，但不能覆盖绝对门槛失败。Candidate 在冻结的 0.05 margin 内对 macro coverage 与 focus 都不劣于 baseline，且没有恶化 narrow-mode 或 enforced-stop safety。

## 各目标结果

| 目标 | Candidate 结果 | 主要观察 |
| --- | --- | --- |
| redux | 失败 | 找到 `src/createStore.ts`，但漏掉 `test/createStore.spec.ts`；广义 reducer 命中加入了 `combineReducers` 实现与测试。Coverage 0.50、focus 0.333、confidence 0.89。 |
| blinker | 失败 | 找到 `src/blinker/base.py`，却选择 `tests/test_context.py` 与 `CHANGES.rst`，漏掉 `tests/test_signals.py` 与 `docs/index.rst`。Coverage、focus 都是 0.333。 |
| sqlx | 失败 | 找到 `named.go`，却漏掉相邻 `named_test.go`，五个泛用 SQL/reflect 文件占掉路线。Coverage 0.50、focus 0.167。 |
| bat | Core 通过、auxiliary 失败 | 实现与 integration test 精确命中、focus 1.0，但缺少预注册的 `CHANGELOG.md`。 |
| pino | 失败 | `lib/redaction.js` 与 `test/redact.test.js` 都没找到，却以 0.90 confidence 选择 `pino.js` 与 `test/basic.test.js`。Coverage、focus 都是 0。 |
| packaging | 通过 | 精确命中两个 implementation/test 文件，coverage、focus 1.0。 |
| afero | 通过 | 精确命中 `path.go` / `path_test.go`，coverage、focus 1.0。 |
| notify | 通过 | 命中两个 oracle 文件并多一个 `notify/src/lib.rs`，coverage 1.0、focus 0.667。 |

## 失败类别

1. **复合任务主体被稀释。** `replaceReducer`、`redaction shape`、`Object.prototype` 等精确主体输给 reducer、logger、context、SQL 等仓库常见词。
2. **Owner-local focused test 没闭合。** 找到 `createStore.ts`、`named.go`、`base.py` 后，没有先保留同 owner 的测试位置，就加入了泛用邻居。
3. **词面命中过度授权。** `context manager` 把路线带到 `test_context.py`，`reducer` 带到 `combineReducers`，中央入口或 import 关系在未覆盖任务 owner 时仍得到高 confidence。
4. **Confidence 缺少 exact-anchor coverage。** Redux 与 Pino 在 coverage 不完整或为 0 时仍严重过度自信。
5. **Auxiliary oracle 的定义仍有歧义。** 冻结门槛要求语义一致的 changelog/docs，但这些文件不一定是执行任务所需上下文。它同时是协议问题与路由问题，不能为了历史 diff recall 就把泛用文档硬塞进产品路线。

## 守住的部分

- 任务分类 8/8 正确。
- 8/8 路线成员与顺序 deterministic。
- 证据不足时全部保持 `full-palace` 与 advisory stop。
- Unsafe narrow mode 与 unsafe enforced stop 都是 0。
- 所有 evaluate/context route 一致。
- Candidate 的指标与独立重算全部一致。
- 没有修改任何目标仓库。

## 下一步研发方向

下一轮产品修复必须保持 repository-agnostic：

1. 分词之外，同时保留完整 camelCase、snake_case、dotted 与 scoped task anchor；
2. exact task-subject anchor 的优先级高于中央度与单词邻居；
3. 选中 implementation 后，为 basename、owner、symbol、import 或 co-change 关联的 focused test 预留位置；
4. 对只命中泛用任务词、但跨 owner 的测试降权；
5. exact-subject 与 owner-local implementation/test 未同时闭合时，限制 confidence；
6. 在新协议证明 auxiliary 文件何时真正必要前，把 changelog/docs recall 与 core execution-context quality 分开。

第 12 轮现在已成为 disclosed regression evidence。任何结果后的修复都只能称为 post-observation；新鲜确认必须使用递归不重叠的第 13 轮。
