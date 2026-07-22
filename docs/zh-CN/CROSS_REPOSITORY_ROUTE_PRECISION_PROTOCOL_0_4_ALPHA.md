# 0.4 Alpha 跨仓库路由精度协议

状态：预注册复制协议。写下这些门槛时，尚未观察候选版本的执行结果。

## 研究问题

0.4 Alpha 的角色优先路由器离开 Vertex Palace 自身仓库后，能否继续保持完整目标文件召回，并把路线控制在固定边界内？

## 候选版本冻结

- 产品提交：`b6ff88fc126800a799973447f5ce6b37b925a6a3`。
- 执行器会在 build 前后检查候选源码、包配置、构建配置与生成 MCP 路径是否仍与该提交一致。
- CLI 使用冻结产品文件构建出的本地 `dist/palace.cjs`。
- 协议和执行器可以位于后续提交，但不能修改冻结的产品文件。

## 仓库集合

这是一组复制目标，不是 held-out 验证。三个目标都曾出现在旧版 Vertex Palace 研究中，因此适合检查不同语言和仓库规模下有没有回归，但不能估计面对全新仓库时的表现。

| 仓库 | 路由提交 | Oracle | 可接受路线边界 |
| --- | --- | --- | --- |
| Zod | `912f0f51b0ced654d0069741e7160834dca742ee` | v4 核心 schema 与聚焦 discriminated-union 测试 | 只能是这两个文件 |
| Requests | `f361ead047be5cb873174218582f7d8b9fcd9f49` | Sessions 实现与聚焦 request 测试 | 只能是这两个文件 |
| p-limit | `c944e4a4363ff41a7202d5dec346cc174c3ecf49` | 到 `ccb80b2721a6a4a27ce5ad7721fe939162a35b31` 的真实 diff | 声明、类型测试和 package manifest |

仓库、commit、任务、changed files 和可接受边界全部冻结在 `scripts/verify-route-precision-cross-repositories.cjs`。

## 执行方法

- 每个固定仓库都克隆到全新的系统临时目录。
- 顺序执行两次 evaluation：第一次冷索引，第二次暖索引。
- 每次 evaluation 后使用相同任务运行自适应 `palace context`。由于 evaluation 会先完成索引，两次 context 都使用已刷新的暖索引；报告会分别标注两种状态。
- 预算：6,000 estimated input tokens。
- 路线限制：9 个文件。
- 最多加载 4 个 drawers。
- 不允许修改目标仓库的 tracked files。

## 验收门槛

每个仓库都必须同时满足：

1. 两次 changed-file coverage 都必须等于 `1.00`。
2. 每个路线文件都必须位于预先冻结的可接受边界内。
3. 两次路线文件集合完全一致。
4. 不得出现相对实际 changed-file coverage 为 overconfident 的路线。
5. 自适应 Context 不超过 6,000 estimated tokens。
6. Selected 与 excluded 边界不能重叠。
7. 目标仓库 tracked worktree 保持干净。
8. p-limit 的即时 Git diff 仍必须等于固定真实历史 Oracle。

失败也是正式记录的一部分。首次执行后，不得删除或替换失败仓库。
执行器会把命令失败、JSON 解析失败及部分完成的 trial 写入证据文件，而不是丢弃整次运行。
证据路径为必填，并采用仅限新建的写入方式。重试必须改用新路径，因此首次观察不能被覆盖。

## 允许的结论

通过只代表：候选版本在这组曾经使用过的跨仓库复制目标上保持静态路由兼容。由于冷暖阶段并不对称，时间字段仅供诊断。它不能证明 held-out 泛化、Agent Token 下降、执行时间缩短或任务成功率提高。

## 下一道门槛

复制验证后，必须选择并预注册至少一个从未出现在 Vertex Palace 实现、测试或研究证据中的仓库与真实历史任务。完成 held-out 静态验证后，才进入随机化 Agent 实验。
