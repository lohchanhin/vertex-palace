# 已公开路由失败开发回归结果（0.4 Alpha，第二轮）

## 结论

**作为已见开发回归通过，但不能视为 held-out 证据。** 产品候选版本 `6060e0c6aa2aea64d0145c1e55bccdc4669e4b48` 在六个已公开仓库上精确命中了 Git diff oracle。顺序执行的 `12/12` 次试验全部完成，macro changed-file coverage、route focus 与 route precision 均为 `1.00`。

这个结果证明第二轮已经发现的静态路由失败在冻结协议下得到修复。它不能证明泛化能力、最终 Agent 正确率、Token 节省或执行时间改善。Express、HTTPX、urfave/cli、Clap、Commander 与 pytest 现在都属于开发资料，不能再次用作 held-out 证据。

## 证据链

所有原始观察都采用 create-only 文件保存，没有覆盖失败结果：

| 阶段 | 候选版本 | 证据类别 | 通过目标 | Macro coverage | Macro focus | Macro precision | Overconfident trials |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 原始第二轮研究 | `0ef19a7` | 预注册 held-out | 0/6 | 0.667 | 0.183 | 0.185 | 4 |
| 第一次公开失败修复 | `aed6ce6` | 已见开发数据 | 3/6 | 0.805 | 0.533 | 0.533 | 4 |
| 真实索引修复 | `83d7da5` | 已见开发数据 | 4/6 | 0.862 | 0.917 | 0.917 | 2 |
| 重名模块消歧修复 | `6060e0c` | 已见开发数据 | 6/6 | 1.000 | 1.000 | 1.000 | 0 |

中间的 `4/6` 结果很重要。Express、Commander 与 pytest 已经修好，但 HTTPX 选错同名测试模块，Clap 又漏掉第二个实现文件。最终机制修复了这两个回归，同时保留所有早期失败记录。

## 冻结证据

| 证据文件 | SHA-256 |
| --- | --- |
| `docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-2.json` | `F6F31375C3C300F32C25063AFC493DD536CDC1A96748199C557772A5275DE438` |
| `docs/research/evidence/disclosed-routing-regression-0.4-alpha-round-2.json` | `726AAF4B1942E73E85B130685489961D4BBD4F2239CDE36C505CE3A23D4B4D22` |
| `docs/research/evidence/disclosed-routing-regression-0.4-alpha-round-2-after-real-index-repair.json` | `3FBD22B751498A1A1D50AB286982F8083FA786EBFA20DDC9E0341BC7A4BB70BE` |
| `docs/research/evidence/disclosed-routing-regression-0.4-alpha-round-2-after-duplicate-module-repair.json` | `22E08D3D98998058FB2530B88508C9427AB71112D8E8328FE7722EE780770EC6` |

- 最终产品 commit：`6060e0c6aa2aea64d0145c1e55bccdc4669e4b48`
- 最终验证 harness commit：`e8d06c83e6eb548d91e8e1af7bf7f4da8ce6b816`
- 最终原始证据 commit：`165630a`
- 证据类别：`seen-development-regression`
- `heldOutAgainstCandidate`：`false`

Harness 使用全新的固定 commit clone，逐项验证未经改写的 commit subject、父子关系、changed-file diff oracle、索引新鲜度和 tracked worktree 清洁度，再对每个目标顺序执行两次。

## 最终汇总

| 目标数 | 通过 | 完成 trials | Core 完整目标 | Macro coverage | Macro focus | Macro precision | Overconfident trials | 最大 context | Setup/harness failures |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6 | 6 | 12/12 | 6/6 | 1.00 | 1.00 | 1.00 | 0 | 5,485 | 0 |

两次重复执行得到完全一致的路线。所有 context 都低于 6,000-token 上限；每个仓库在显式索引后均为 fresh；Palace 没有修改 tracked 文件；selected 与 excluded context boundary 没有重叠。

## 最终精确路线

| 仓库 | 精确路线 | Confidence | 校准状态 |
| --- | --- | ---: | --- |
| Express | `lib/request.js`；`test/req.acceptsCharsets.js` | 0.40 | underconfident |
| HTTPX | `httpx/_auth.py`；`tests/test_auth.py` | 0.71 | underconfident |
| urfave/cli | `completion.go`；`completion_test.go` | 0.56 | underconfident |
| Clap | `clap_complete/src/engine/complete.rs`；`clap_complete/src/engine/custom.rs`；`clap_complete/tests/testsuite/engine.rs` | 0.81 | underconfident |
| Commander | `lib/command.js`；`tests/command.executableSubcommand.mock.test.js`；`tests/command.executableSubcommand.search.test.js` | 0.71 | underconfident |
| pytest | `src/_pytest/main.py`；`testing/test_conftest.py` | 0.68 | underconfident |

六个目标的 coverage、focus 和 precision 都是 `1.00`。保守分数比早期零覆盖却高置信度更安全，但仍须使用未见观察继续校准。

## 新增的通用机制

1. JavaScript 与 TypeScript 文件摘要会索引测试及测试套件的字面标题，包括带包装器的测试调用。
2. 将 deduplication 的多种写法统一为同一任务概念，不再错误注入 memory 或 pitfall 意图。
3. `re-collection` 等构词形式不会再被误认为具名代码实体。
4. 只有共享主要任务或实体证据的同一物理文件 symbol 才会合并证据。
5. 实现与测试采用不同角色证据：主要动作优先选择实现，任务结果帮助选择测试。
6. 附加测试必须提供独立任务或实体证据；route limit 仍是上限，不是必须填满的配额。
7. 判断相关实现是否覆盖大部分任务时，使用用户明确写出的任务概念，而不是分析器扩展提示。
8. `refresh token` 不再触发索引新鲜度；位置参数的 `index` 也不会自动注入 `stale` 与 `fresh`。
9. 只有多个同模块测试同时竞争时，才使用目录镜像消歧，因此不会压过 Click 的强语义测试 `test_utils.py`。
10. 当已选测试与两个同目录实现共同覆盖明确的复合代码身份时，可以保留第二实现，例如 `ValueCompleter`。
11. 直接身份、关系证据或 anchor margin 不足时，主动限制 confidence。

生产规则没有写入仓库名称、commit hash 或目标专用路径。

## 仍存在的限制

开发阶段自我评估仍显示广泛复合任务的召回不足。一次八文件修复路线只命中 `5/8`，漏掉 parser、parser test 与生成的 MCP bundle；后续四文件修复只命中 `2/4`，漏掉 router test 与生成 bundle。这些诊断不是正式 held-out 门槛，但说明“聚焦任务精确”不代表“复合产品任务的多表面路线完整”。

因此 Palace 必须继续保持 advisory。当前代码、测试、Git diff、build 输出与 runtime 证据始终可以授权 Agent 扩大检查范围。

## 解释限制

- 最终六个仓库都在修复期间被检查过，不能衡量泛化能力。
- 每个目标重复两次只能证明本轮行为确定，不能估计总体可靠度。
- Git diff 是可复现 oracle，但未经改写的 commit subject 不一定同等描述每个改动文件。
- 静态路线大小与 context payload 不能代表最终 Agent 正确率、reported Tokens、wall time 或工具调用次数。
- 最大 5,485 estimated tokens 只证明没有超过 context 上限。
- 本结果不授权任何 Agent 节省 Token、提高速度或产品发布声明。

## 晋级决定

候选版本通过第二轮已公开失败回归，但不能直接进入 Agent A/B。下一道门槛必须是机械选择、预注册，并且在候选版本、任务列表、oracle 与 harness 全部冻结前保持未接触的第三批仓库。

只有第三批仓库通过相同的 coverage、focus、precision、确定性、confidence 校准、worktree 清洁度与 context boundary 门槛后，才应顺序执行 Control、Adaptive 和 Full Palace Agent 实验。
