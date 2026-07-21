# 跨栈执行合同（0.4.0-alpha）

状态：这是第三代研究之后的工程验证，不属于正式 v4 Agent 结果，也没有发布到 npm、Git tag 或 GitHub Release。

## 问题

v3 证据显示，跨栈 payload 即使较大，只要带有可执行边界，仍可能减少 Agent 后续调用。尚未解决的问题包括：同一路径与理由重复、同一层出现多个实现候选、没有机器可读的禁止重开标记，以及停止指引缺少结构化约束。

## 新合同

跨栈 Adaptive pack 现在会：

- frontend、backend、contract 每一层最多保留一个实现 anchor；
- 保留直接相关验证证据；
- 把同层多余实现候选移到 Deferred；
- 提供包含 input、output、invariant、prohibited change 的 Contract Capsule；
- 对已完整交付的 `full_file` / `full_symbol` 标记 `do_not_reopen: true`；
- 要求批量验证与最终 changed-file scope 检查；
- 输出 `stopEnforced: true` 和明确的立即停止条件。

面向人的 Markdown 不再在源码 drawer 上方重复已载入的 Primary / Support 路径，也不会重复已经完整交付的 Required Evidence 路径。JSON 的路线交付记录会把同一个正规化路径只放在“未载入 Primary、已交付 Context、Deferred”其中一个位置。为兼容和审计保留的 execution-boundary 数组仍是显式控制 metadata。

## 安全交互

如果已从历史决策推断出 tenant/client scope，该范围优先于跨栈 anchor 提升。这样可避免 tenant 自有实现已经成为 Primary 后，又把通用 backend 候选提升成第二个 Primary。

## 回归证据

跨栈 fixture 同时要求 frontend、backend、contract 与测试覆盖；验证每层一个实现 anchor、正规化 route path 不重复、Contract Capsule、禁止重开、批量验证与停止约束，并同时检查 JSON 和 Markdown。原有 decision-memory scope 回归必须继续通过。
