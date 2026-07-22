# 未见跨仓库路由结果（0.4 Alpha）

## 结果

**失败。** 冻结候选 `0b6a0fd92f43a74c983663cd32f937087e3ec923` 在四个机械选中的 held-out 目标中 `0/4` 通过，因此不能进入 Agent 端到端性能实验。

这是这些仓库与任务的第一次静态路由观察。从现在起，它们已经成为公开开发资料，调校后的后继版本不能再把它们当作 held-out 证据。

## 冻结证据

- 选题协议与脚本 commit：`2be2dc11673fbdf23112a420048af3a2a27914fb`
- 目标 manifest commit：`b91dbd14a69f92fa84fa9f4175b1c3c33bd6d342`
- 验证协议与脚本 commit：`1fc5caee4b5c60a95246699071c9d5502d8d9e9f`
- 原始证据 commit：`813f09c87cdd7372b24a1c4b530e474bc122b38b`
- 原始证据路径：`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha.json`
- 原始证据 SHA-256：`B466582D48A1E2B70ED679BA4ADD7AB5192EF0F3E6A875CB70B7C0C336396606`
- 正式执行次数：一次 create-only 观察

## 汇总

| 目标数 | 通过 | 完成 trials | Macro coverage | Macro focus | Macro precision | Overconfident trials | 最大 context | Setup failures |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 4 | 0 | 6/8 | 0.50 | 0.11 | 0.111 | 2 | 2,986 | 0 |

两个未完成 trial 都来自 Click 的 context 量测错误。八次 route evaluation 实际都已执行，而且同一仓库两次得到相同路线；正式 aggregate 只有在 evaluation 与 context telemetry 都处理完成后才把 trial 计为 completed。

## 各目标结果

| 仓库 | Coverage | Focus | Precision | Confidence | 路由文件数 | 结果 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Fastify | 0.50 | 0.11 | 0.111 | 0.57 | 9 | 失败：漏掉直属测试，路线被填满 |
| Click | 0.50 | 0.11 | 正式未记录；事后计算 0.111 | 0.64 | 9 | 失败：漏掉实现文件；context harness 异常 |
| Cobra | 1.00 | 0.22 | 0.222 | 0.60 | 9 | 失败：召回完整，但同类文件过多 |
| Marked | 0.00 | 0.00 | 0.000 | 0.34 | 9 | 失败：CLI 入口与聚焦测试都遗漏；过度自信 |

每个仓库在显式 index 后都是 fresh，tracked Git 状态也保持干净。没有失败来自仓库下载、checkout 或索引准备。

## 路由实际表现

### Fastify

Palace 找到 `lib/route.js`，却漏掉 `test/find-route.test.js`，其余八个位置被相关路由文件与泛化路由测试占用。任务使用 camelCase `findRoute`，测试路径使用 `find-route`；当前词法模型没有充分保持这两个名称的同一性。

### Click

Palace 找到 `tests/test_utils.py`，但漏掉 `src/click/_compat.py`，改为选择广泛的 testing、terminal 与 utility 模组。Commit subject 描述 flaky pager test 与 Python 3.14t，却没有写出 compatibility 模组名称，因此这是困难但合理的搜索任务。

之后 context 量测出现 `TypeError: Cannot read properties of undefined (reading 'primary')`，原因是 harness 假设每种 context mode 都有 `executionBoundaries`。这是验证契约缺陷，不是环境失败；它不会改变产品结论，因为已完成的 evaluate 路线本身就没有通过 coverage 与 focus 门槛。

### Cobra

Palace 同时找到 `completions.go` 与 `completions_test.go`，说明 fallback language 具备有用召回能力；但九个路由位置全部被 completions 同类文件填满，focus 与 precision 只有 0.22。只召回正确文件仍然不够。

### Marked

Palace 走向 Markdown parser 内部，完全漏掉 `bin/main.js` 与 `test/unit/bin.test.js`。现有 CLI 表面规则能识别常见 CLI 目录，却没有充分识别仓库的 `bin` 入口。零覆盖时 confidence 仍为 0.34，两次都被判定 overconfident。

## 主要发现

1. **已见目标成绩没有泛化。** 前一轮双语回归虽然是 9/9，通过真正 held-out 后却是 0/4。
2. **Route limit 仍像 quota。** 四个 held-out 路线全部刚好 9 个文件，即使已经找到正确文件也继续填充，造成严重稀释。
3. **跨命名风格的直属测试配对不足。** camelCase、hyphenated path 与广泛 utility test 没有稳定配对。
4. **仓库入口惯例覆盖不完整。** `bin/main.js` 没有被当成强 CLI 实现候选。
5. **Fallback parser 能召回，但不够聚焦。** Cobra 找到 2/2，却无法排除同关键词 sibling。
6. **置信度安全仍有 held-out 失败。** Marked 在零覆盖时 confidence 为 0.34。
7. **验证契约也需要强化。** Context telemetry 必须兼容 bypass 等紧凑响应，不能假设 `executionBoundaries` 一定存在。

## 解释限制

- 每个任务直接使用未改写的 Git commit subject，因此可观察信息不同。Click 明显比其实现 diff 更含糊。
- 目前只有四个仓库，其中两个是 JavaScript；这是第一组 held-out 信号，不是总体估计。
- 静态路由失败足以拒绝晋级，但不会直接等同最终 Agent 任务表现。
- 时间数据仍只用于诊断，不能支持 Token 或速度声明。

## 后续研发方向

下一候选应该修通用机制，而不是写死仓库名称：

1. 在任务、symbol 与 path 之间统一拆分和正规化 camelCase、PascalCase、snake_case、hyphenated identifiers。
2. 让 route limit 真正成为 ceiling，加入 score drop 或 evidence sufficiency 停止条件，不再自动填满。
3. 使用正规化 basename concept、import 或 co-consumer 证据加强实现与聚焦测试配对。
4. 把 `bin`、可执行入口和仓库命令表面识别为 CLI 实现。
5. 改善 fallback language 的结构信息，让聚焦文件对能与同关键词 sibling 分开。
6. 找不到直接实现/测试配对或要求入口表面时，主动降低 confidence。
7. 下一次正式研究前，先统一验证 harness 对所有 context response mode 的处理。

这四项任务之后可以用于开发回归。后继版本必须重新选择完全未接触的仓库池，并再做一轮预注册 held-out 研究，才可以进入 Agent A/B benchmark。

