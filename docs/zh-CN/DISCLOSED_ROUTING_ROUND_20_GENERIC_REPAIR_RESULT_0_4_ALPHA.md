# Round 20 通用修复事后回归结果（0.4 Alpha）

状态：两次事后静态回归均已完成。第 2 次通过全部已披露回归门禁，但 Round 20
正式稳定版门禁继续保持 **FAILED**，且不可修改。

## 声明边界

Round 20 正式证据仍是该轮发布决定的唯一依据，SHA-256 为
`AEF391A3FF7CBF918F3856DBAEF698DCD41074EBEA667626B55C6D63DCD38D58`。

两次修复回归都重用了已经看过的 8 项任务，因此不是 held-out 证据。它们没有
执行目标仓库测试，也没有运行 Agent，不能证明新的泛化能力、Agent 正确率、
Token 节省、工具调用减少或总耗时改善。只有重新公开预注册的新仓库轮次，才有
资格推动 npm 稳定版。

## 通用修复

1. 把动作词 `add` 视为任务语法，不再当成仓库检索证据。
2. 新功能完全没有词法锚点时，以低信心返回唯一明确的常规实现入口与直接测试。
3. 有边界地扩展 Python 字符串注解、fail-fast 取消行为与 Apple 平台族语义。
4. 新增根级 option 时，在这些表面属于外部契约的情况下，闭环到类型声明与
   README 公开说明。
5. 新增方法没有指定 owner 时，闭环到同目录、直接相关的 API 变体及其镜像测试。
6. 证据图显示已选实现与测试经过某个源码文件连接时，保留该传递实现桥。
7. 只有所有已选实现都属于同一个明确 workspace 时才限制 workspace；根源码与
   workspace 混合路线仍可加入根级实现桥。
8. 缺少精确任务主体证据时，继续保持保守信心。

## 两次回归轨迹

| 指标 | 正式候选 | 第 1 次 | 第 2 次 |
| --- | ---: | ---: | ---: |
| 完成目标 | 8/8 | 8/8 | 8/8 |
| 通过目标 | 3/8 | 6/8 | 8/8 |
| 路由确定性 | 8/8 | 8/8 | 8/8 |
| 核心实现/测试完整 | 3/8 | 6/8 | 8/8 |
| 目标宏平均 changed-file coverage | 0.655 | 0.896 | 1.000 |
| 目标宏平均 route focus | 0.579 | 0.774 | 0.787 |
| 最低单目标覆盖率 | 0.000 | 0.500 | 1.000 |
| 最低单目标聚焦度 | 0.000 | 0.400 | 0.400 |
| 过度自信试次 | 2 | 0 | 0 |
| 指标分歧 | 0 | 0 | 0 |
| 路由文件总数 | 28 | 30 | 33 |

第 1 次修复了无 Primary 与任务语义偏题，但还留下两个核心闭环缺口：`conc`
只选中 `ContextPool`；`backtrace-rs` 找到两个测试，却漏掉路线锚点之间的符号化
实现。第 2 次加入仓库无关的同族闭环与图关系闭环，在不修改 oracle 或门槛的
情况下通过全部 8 个已知目标。

## 第 2 次各目标表现

| 目标 | 覆盖率 | 聚焦度 | 主要结果 |
| --- | ---: | ---: | --- |
| `mimic-fn` | 1.000 | 1.000 | 闭环运行时、声明、测试与 README 契约。 |
| `is-unicode-supported` | 1.000 | 1.000 | 找回低信心常规入口与测试。 |
| `pyupgrade` | 1.000 | 0.400 | 保留正确 PEP 563 owner、测试及有界 typing 支援。 |
| `add-trailing-comma` | 1.000 | 0.667 | 覆盖精确实现/测试改动与一个支援文件。 |
| `conc` | 1.000 | 1.000 | 两种 pool 变体及两份镜像测试全部闭环。 |
| `termenv` | 1.000 | 0.625 | 保留完整跨平台路线。 |
| `backtrace-rs` | 1.000 | 0.600 | 找回 `gimli.rs` 因果桥与两个验证表面。 |
| `tempfile` | 1.000 | 1.000 | 保持精确实现/测试对。 |

## 验证

- TypeScript lint 通过。
- Workspace 测试通过：Core `239/239`；CLI 与 MCP `4/4`。
- 研究测试：`233` 项通过，`2` 项按协议跳过。
- 路由回归：`114/114` 通过。
- Workspace、生成 MCP 与 npm CLI 构建通过。
- MCP smoke 的 `10` 个工具全部通过。
- 干净 tarball 的 release-candidate 验证通过。
- `npm pack --dry-run --json` 产生预期的 7 文件套件。
- 第 2 次完成 `8/8` 目标、`16/16` 次确定性执行；目标工作树保持干净，独立
  重算指标与产品输出一致。

机器可读证据：

- [Round 20 正式证据](../research/evidence/local-blind-routing-validation-0.4-stable-round-20.json)，SHA-256 `AEF391A3FF7CBF918F3856DBAEF698DCD41074EBEA667626B55C6D63DCD38D58`
- [第 1 次](../research/evidence/disclosed-routing-round-20-after-generic-repair-attempt-1-0.4-alpha.json)，SHA-256 `8562DD560A93B5DC11F8EDF66B9A0F3F4050ED4EFBA4E846A332933D7ACF0606`
- [第 2 次](../research/evidence/disclosed-routing-round-20-after-generic-repair-attempt-2-0.4-alpha.json)，SHA-256 `82920E86DBC9EA5408D7F6B1E7DCEB9F8D57C155924A6FD372FA229CE80B881B`

事后回归通过只授权进入新 held-out 研究，不授权直接提升 npm 稳定版。
