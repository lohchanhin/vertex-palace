# Round 10 披露后通用因果修复结果（0.4 Alpha）

## 声明边界

预注册的 Round 10 正式门槛仍然是 **FAILED**。Attempt 3 是结果披露后的修复复测，候选实现已经见过 Round 10 的失败信息，因此不属于 held-out 证据。它不能授权端到端 Agent A/B，也不能替代全新的 Round 11。

另外提供的“任务一致子集敏感性分析”同样属于事后分析。它只估算完整排除一个混合语义 target 后的结果，不会改写冻结 oracle，也不会把正式失败改成通过。

## 本轮通用修复

实现中没有加入仓库名或目标名硬编码：

1. Rust fallback parser 只有在生成函数、仓库内相对路径常量和明确文件写入调用同时成立时，才声明生成产物。
2. 已被正常扫描的生成文件保留完整解析内容，同时获得生成来源标记。
3. 索引通过高置信度 `configures` 与 `changed_with` 边记录生成器到产物的所有权。
4. 已被解析证据证明的生成器-产物对可以阻止相似 codegen 文件继续填满路线。
5. 当下游版本实现依赖任务指定的版本实现时，可以只根据修改前 import 链推断对应的下游版本测试。

合成回归也已收紧：生成产物不再反向 import 生成器，v6 测试不再包含修改后才出现的 multicast 描述。

## 工程验证

- Core：14 个测试文件，197/197 通过。
- Router：84/84 通过。
- CLI：2/2 通过。
- MCP：2/2 通过。
- 完整 workspace build 通过，包括插件 MCP 与 npm CLI bundle。
- 10 项 MCP 工具 smoke test 通过。
- 披露后复测路线全部确定性一致，目标仓库工作树保持干净。

## 披露后修复链

| 观察结果 | 通过 | 核心完整 | 宏观覆盖率 | 宏观聚焦度 | 过度自信次数 | 门槛 |
|---|---:|---:|---:|---:|---:|---|
| 冻结的 held-out candidate | 4/8 | 5/8 | 0.804 | 0.810 | 0 | FAILED |
| 披露后 Attempt 1 | 5/8 | 5/8 | 0.808 | 0.665 | 2 | FAILED |
| 披露后 Attempt 2 | 6/8 | 7/8 | 0.975 | 0.706 | 0 | FAILED |
| 披露后 Attempt 3 | 7/8 | 7/8 | 0.975 | 0.790 | 0 | FAILED |
| 任务一致敏感性子集 | 7/7 | 7/7 | 1.000 | 0.831 | 0 | PASSED（仅诊断） |

Attempt 3 同时达到：不安全窄路线为 0、错误强制停止为 0、指标分歧为 0、evaluation/context 路线分歧为 0，而且没有 context pack 超过 6,000 Token 上限。

## 已修复真实目标

### syn

Attempt 1 选入十个错误的 generated-code 邻居，并漏掉两份核心文件。Attempt 2 已命中核心文件，但路线仍有六个文件，聚焦度只有 0.333。Attempt 3 最终停在明确的生成所有权对：

- `codegen/src/snapshot.rs`
- `tests/debug/gen.rs`

覆盖率与聚焦度均为 1.000。

### uuid

当前候选可以从修改前的 `v6 test -> v6 implementation -> v1 implementation` 依赖链推断下游影响。精确路线为：

- `src/v1.ts`
- `src/test/v1.test.ts`
- `src/test/v6.test.ts`

覆盖率与聚焦度均为 1.000。合成 v6 回归数据没有使用修改后才出现的 multicast 提示词。

## 正式结果仍失败的原因

Attempt 3 唯一失败目标是 `itsdangerous`。冻结任务是“Added SHA-512 fallback by default”，但对应 commit 同时包含：

- `src/itsdangerous/timed.py`：另一项 `SignatureExpired` 控制流行为修改。
- `tox.ini`：与功能无关的 pytest traceback 显示设置。

路线已经找到 serializer 实现、serializer 测试、变更记录和 tox 配置，但没有从任务描述推断出无关的 timed-serializer 行为。由于冻结 oracle 仍把 `timed.py` 视为核心文件，所以正式门槛必须保持失败。

事后语义审核保存在 [round10-task-diff-coherence-audit-0.4-alpha.json](../research/evidence/round10-task-diff-coherence-audit-0.4-alpha.json)。敏感性分析排除的是完整 target，而不是只挑有利文件。

## 证据文件

- [冻结 Round 10 正式结果](../research/evidence/local-blind-routing-validation-0.4-alpha-round-10-attempt-1.json)
- [披露后 Attempt 1](../research/evidence/disclosed-routing-round-10-after-generic-causal-repair-attempt-1-0.4-alpha.json)
- [披露后 Attempt 2](../research/evidence/disclosed-routing-round-10-after-generic-causal-repair-attempt-2-0.4-alpha.json)
- [披露后 Attempt 3](../research/evidence/disclosed-routing-round-10-after-generic-causal-repair-attempt-3-0.4-alpha.json)
- [任务一致敏感性分析](../research/evidence/disclosed-routing-round-10-attempt-3-task-coherent-sensitivity-0.4-alpha.json)

## 下一阶段判定

Round 11 必须在候选冻结前审核任务描述与每一个 diff hunk 的语义一致性。混合语义 commit 必须整项淘汰，并在运行任何候选路线前记录淘汰理由。只有全新的 held-out Round 11 通过相同的安全、覆盖、聚焦、确定性、工作树干净与上下文预算门槛后，才可以进入 Agent A/B。
