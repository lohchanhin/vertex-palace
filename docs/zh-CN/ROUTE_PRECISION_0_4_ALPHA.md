# 0.4 Alpha 路由精度研究

状态：探索性产品证据，不是 AI Agent 性能基准。

## 研究问题

一般多表面路由器能否停止把 `routeLimit` 当成必须填满的数量，在保持真实改动文件完整召回的同时，移除旧版资料和通用兄弟模块造成的冗余？

## 固定 Oracle

前后两次评估使用相同任务、相同仓库、相同路线限制、相同预算，以及相同的 7 个实际改动文件。Oracle 覆盖实现、聚焦回归测试、双语研究记录、机器可读证据和生成后的 MCP bundle。

任务原文：

> Improve multi-surface routing and release-verification artifact intent; add role-aware implementation and focused regression tests, bilingual research records, record machine-readable evidence, and rebuild the generated MCP bundle.

基准提交：`fec16398324a261b7ca500a78e27f5f98d6318bc`

## 结果

| 指标 | 修改前 | 候选版本 | 验收条件 |
| --- | ---: | ---: | ---: |
| 改动文件召回 | 7/7 | 7/7 | 此固定 Oracle 至少 7/7 |
| Changed-file coverage | 1.00 | 1.00 | 至少 0.90 |
| 路线文件数 | 12 | 9 | 不超过 9 |
| Route focus | 0.58 | 0.78 | 至少 0.75 |
| Route confidence | 0.35 | 0.75 | 动态计算，不再固定为 0.35 |
| 静态 Context Pack | 3,756 tokens | 2,631 tokens | 仅作描述，不代表 Agent 节省量 |

候选版本通过了本轮固定路线质量门槛。旧版 0.3 报告、旧版 0.3 证据、`route-scorer.ts` 和 `analyze-task.ts` 已从路线移除；7 个 Oracle 文件以外仍保留 2 个具有图关系证据的支持文件。

## 实现变化

- 多表面任务先按请求角色选择代表文件，再考虑补充上下文。
- `routeLimit` 仍是硬上限，但不再是必须填满的目标。
- 最多加入 2 个补充文件，而且必须具有图关系证据。
- 实现概念改从任务原文和文件名推导，避免共同的 `router/` 目录把所有模块误判成同一概念。
- 出现路线规划意图时优先 planner；任务明确谈评分或 confidence 时仍可优先 scorer。
- 位于研究 evidence 目录内的 JSON 默认属于证据；只有 trial、run、trace、transcript 和 raw 输出会被明确排除。
- 广泛任务的 confidence 改由请求表面覆盖率和角色集中度决定，不再套用固定 `0.35` 上限。

## Confidence 边界

候选路线 confidence 为 `0.75`，而此 Oracle 的实际 changed-file coverage 为 1.00，因此评估器仍把它标记为 underconfident。这里没有为了让单一样本显示绿色而继续调高数值。下一次校准必须使用跨仓库、不同任务类型和保留样本。

## 对抗式自我审计

第一组 frozen oracle 通过后，本阶段 7 个实际改动文件的首次自评又暴露了第二个失败。对同时要求 planner 和 scorer 的明确任务，路线最初只命中 4/7，focus 为 `0.44`，confidence 却达到 `0.77`，属于 overconfident。第二个回归夹具先保存了这个失败，再开始修改实现。

把规划与评分拆成两个角色、阻止 JSON evidence 占用叙述性文档配额，并在选择 evidence 家族时优先任务开头主题后，同一个自评达到 7/7、9 个路线文件、focus `0.78`，而且没有警告。最终自评为 `evaluation_3e0b7d341232e2dc`。

## 验证结果

- TypeScript lint 通过。
- 完整 build 通过，并重新生成 `plugins/vertex-palace/mcp/server.cjs`。
- 共 111 项测试通过：Core 107、CLI 2、MCP 2。
- MCP smoke 通过，共注册 10 个工具。
- Clean tarball release-candidate 验证通过。
- 修改前评估：`evaluation_b8125773b31dd3ae`。
- 最终 frozen oracle 复验：`evaluation_0843e4b45c7858ab`。

## 声明边界

本结果只证明：在一个固定的真实仓库 Oracle 上，静态路线变得更集中。它不能证明 AI Agent 的端到端 Token、执行时间或任务成功率已经改善。相关结论必须来自多个仓库上的随机化 Control、Adaptive 和 Full Palace 实验。

## 后续方向

1. 在不同语言和目录结构的仓库重复固定 Oracle 方法。
2. 除了召回率，还要测量错误排除率。
3. 使用保留路线校准 confidence，不能继续依赖本开发样本。
4. 静态路线门槛跨仓库成立后，再执行顺序随机化的 Agent 实验。
