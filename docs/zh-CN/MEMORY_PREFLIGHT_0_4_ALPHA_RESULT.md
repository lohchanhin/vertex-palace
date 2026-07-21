# Memory Preflight 0.4.0-alpha 工程结果

状态：实现与验证完成。这是第三代研究之后的工程研发，不是第四代 Agent
正式实验，也没有修改或扩写已经冻结的 v1、v2.2 与 Control-First v3 结果。

[English](../research/MEMORY_PREFLIGHT_0_4_ALPHA_RESULT.md) | [设计说明](../research/MEMORY_PREFLIGHT_0_4_ALPHA_DESIGN.md)

## 根因

旧流程会先读取一次记忆做 probe，只把 `items.length` 交给模式选择器；进入
packer 后又重新筛选一次。两次筛选采用不同的年龄、数量、Token 与相关度
政策。同时，只要任务出现 stale、memory 或 tenant 关键词，就会在确认候选
是否已经全部安全排除之前强制进入 guarded mode。

因此，即使最终没有交付任何记忆，也可能产生固定的 Guarded Memory 成本，
而且 probe 与最终 payload 的 telemetry 可能互相矛盾。

## Test-first 证据

第一轮刻意先加入回归测试，得到 9 项失败、88 项既有测试通过。失败准确复现：

- 同一个 `palace context` 调用了两次记忆筛选；
- 70 天记忆被 probe 纳入、却被 packer 排除；
- expired / scope_mismatch 全部安全排除后仍进入 guarded；
- packer 忽略已经准备好的记忆结果；
- 缺少 preflight 决策、拒绝数量与模式变化 telemetry。

## 已实现

- 新增统一 `MemoryPreflightResult`、决策状态、拒绝计数与模式变化 telemetry。
- 统一筛选政策：最多 3 条、600 estimated tokens、90 天、最低相关度 2。
- `palaceContext` 只筛选一次；mode selector 与 packer 使用同一个结果。
- 所有候选仅因过期或范围不符而被拒绝、且纳入数量为 0 时，不再强制 guarded。
- 当前有效的决策记忆、无法交付的相关记忆，以及明确要求决策记忆却找不到候选
  的任务，仍然保持 guarded。
- Markdown 只显示一条紧凑拒绝摘要；JSON 增加 `memoryRejection`，同时保留
  原有可审计 telemetry。
- bypass JSON 仍严格只有 `mode`、`primaryCandidate`、`reason` 三个字段。

## Before / After

| 记忆状态 | 以前 | 现在 |
| --- | --- | --- |
| 无记忆风险、任务聚焦 | bypass / route-lite | 不变 |
| 当前、相关、低风险记忆 | full-palace | 不变 |
| 当前决策记忆或租户敏感记忆 | guarded-memory-palace | 不变 |
| 候选全部 expired / scope_mismatch | 关键词强制 guarded | 按结构风险选择 bypass / route-lite / full |
| 明确依赖决策但无候选 | guarded | guarded，并显示可审计警告 |
| 相关记忆因预算无法交付 | guarded | 视为未解决冲突，继续 guarded |

## 验证结果

- `pnpm build`：通过。
- `pnpm test`：core 99、MCP 2、CLI 2，共 103 项通过。
- `pnpm lint`：通过。
- `pnpm test:mcp-smoke`：10 个 MCP 工具通过。
- `pnpm test:release-candidate`：通过。
- 240 个干扰文件下连续 4/4 选择 bypass，每次仍只有 3 个 JSON 字段。
- Aurora 历史别名继续正确进入 guarded，并只提升 Aurora 实现文件。
- 50 条记忆候选的 Markdown 与 JSON 均保持在 5000-token ceiling 内。

第一次完整 build 曾发现 `GuardedMemoryItem` 搬到 shared 后产生重复导出；现已
修正为只透过 shared re-export 对外暴露。这个失败被保留为研发证据，没有删除。

## 工具自我评估的负面结果

Palace 对本次实际改动的 changed-file coverage 只有 64%，但预测 confidence 为
0.85，因此被判定为 overconfident。它遗漏了三个回归测试文件与生成的 MCP
产物。这表示记忆修复本身已经通过验证，但多测试文件与生成产物的路由仍需优化。

评估中的 99.2% 只代表 context pack 相对整个仓库的体积缩减，不能当作 Agent
端到端节省 Token 或加速的证据。

## 后续方向

下一批应加入更紧凑、provenance 更完整的 Decision Capsule，以及 section-level
payload 统计，用来区分 Palace payload 成本与 Agent 是否遵守路线的成本。之后
可以准备全新的 v4 真实仓库协议，但正式实验必须另行冻结并经过人工审核。

本次没有发布 npm、没有建立 Git tag，也没有创建 GitHub Release。
