# 建议式安全契约（0.4.0-alpha）

状态：v3 之后的本地研发版本。本次工作不修改已冻结的基准证据，也不发布
npm、Git 标签或 GitHub Release。

[English](../research/ADVISORY_SAFETY_CONTRACT_0_4_ALPHA.md)

## 为什么要改

机制审计发现一个危险耦合：低置信度路线可能进入 `full-palace`，但 context
pack 仍会输出强制性的 `Do Not` 和 `stopEnforced: true`。也就是说，证据越不足
的路线，反而可能越早限制 Agent 的探索范围。

这次改动把“提供多少上下文”和“Palace 有多少介入权”拆开。Palace 仍可提供
精简候选路径，但只有通过明确证据门槛后，才允许强制停止。

## 证据状态

| 状态 | 含义 | 必须采取的行为 |
| --- | --- | --- |
| `sufficient` | 存在 Primary 候选、路线置信度至少 0.7、记忆预检已完成，而且没有未补齐的相关证据。 | 可以进一步判断是否允许 bounded。 |
| `insufficient` | 路线置信度、Primary、记忆预检或记忆交付不完整。 | advisory，并保持 fail-open。 |
| `conflicted` | 记忆预检仍有未解决冲突。 | advisory，直到当前代码、测试或运行证据解决冲突。 |

0.7 是保守的介入门槛，不是经过校准的正确率，也不代表路线已经完整。

## 介入策略

默认策略是 `advisory`。只有同时满足以下条件，才可使用 `bounded`：

1. 证据状态为 `sufficient`。
2. 模式是 `bypass` 或 `route-lite`。
3. 不存在记忆依赖、旧记忆、跨前后端、租户隔离、公开契约、全仓范围或修改验证文件的风险。

即使当前证据显示充分，`full-palace` 和 `guarded-memory-palace` 仍保持
advisory。范围较广或依赖历史记忆的任务，不应只凭静态路由获得强制停止权。

## Fail-open 输出

建议式 context pack 会：

- 将 `stopEnforced` 设为 `false`；
- 把 Primary 描述为起点，而不是唯一允许范围；
- 当任务、代码、测试或运行证据指向其他位置时，允许进入 Deferred 或 Excluded；
- 明确说明 Palace 不能授权提前停止；
- 继续保留租户隔离和公开契约等真正的安全约束。

`bypass` 仍不携带源码，但 Markdown 与 JSON 会新增 `evidenceStatus` 和
`interventionPolicy`，避免最小 payload 暗中携带强制权。

## 验收条件

- 高置信度、低风险的单文件任务为 `sufficient/bounded`。
- 低置信度任务为 `insufficient/advisory`，且不强制停止。
- 未解决的记忆冲突为 `conflicted/advisory`。
- 跨层 full-palace 输出必须 advisory 和 fail-open。
- 重复 small-local 任务继续使用最小 bypass，不退回更重模式。
- 既有记忆、payload 计量、路由和发布测试继续通过。

## 工程验证

- `pnpm test`：core 103、CLI 2、MCP 2，共 107 项通过。
- `pnpm lint`：全部 workspace TypeScript no-emit 检查通过。
- `pnpm build`：shared、core、CLI、MCP、plugin MCP 与 package CLI 通过。
- `pnpm test:mcp-smoke`：安装后的 10 个 MCP 工具通过。
- `pnpm test:release-candidate`：clean install、Git 隔离、记忆范围、密集记忆上限与安装后 MCP 全部通过。
- 240 个干扰文件下连续 4 次保持 bypass，并明确输出
  `insufficient/advisory`；每个 JSON 有 5 个字段、625 bytes。
- 密集记忆 JSON 使用 4,343 / 5,000 estimated tokens，Markdown 使用
  4,522 / 5,000。

core 的 fixture 测试现在采用文件级串行，并保留单项 15 秒上限。原因是同一批磁盘
密集测试独立运行会通过，但多文件并行时会因磁盘争用超时。实际耗时仍会显示，
断言失败也不会因此变成通过。

## Palace 自我评估

修正 changed-file 参数后，自评收到完整 18 个变更文件。路线命中 2 个核心实现，
遗漏 16 个支援表面，包括测试、双语记录、shared types、发布脚本、测试配置与生成的
MCP 产物。观察覆盖率为 0.11，路线置信度为 0.35，因此 Palace 将自己判断为
overconfident 和 `needs-review`。

98.2% 只代表静态 context pack 相对仓库文本的体积缩减，不能证明 Agent Token 更少、
完成更快或正确率更高。多表面覆盖率偏低会作为负面工程结果和独立路由问题保留，
但不会取代上面已经实际执行的测试门禁。

## 下一步实验

这项实现只是安全前置条件，不能直接证明 Agent 表现已经改善。后续需要在任务、
模型、顺序、环境和评分固定的条件下，盲测比较 Control、Sham Palace、Advisory
Palace 与旧 bounded 契约。
