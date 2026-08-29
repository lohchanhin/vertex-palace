# 自适应 Context 预算契约修复

## 状态

实现提交：`df181ab2395cf9a4e887f64d44aacc5129d7d2e0`

证据类别：公开失败样本的回归修复，不是新一轮盲测资格证明。

## 问题

V5 暴露了自适应 context 打包的契约缺口。调用方传入 6,000 Token 预算后，模式选择器仍可合理地采用更窄的 2,400 或 5,000 Token 上限；但当所有源码抽屉都被移除后，如果固定元数据本身仍然超限，旧实现会直接报错退出。

这使“有界模式”变成了“命令失败”。问题不只是上限较小，而是缺少一个有界、结构化、可观测的降级结果。

## 修复方式

打包器现在会依次尝试 `compact`、`minimal`、`emergency` 三个确定性降级级别。

降级结果优先保留任务补全状态、Primary 路径、有界 Deferred 路径、必要证据、当前记忆计数，以及禁止事项和停止条件；源码抽屉、支持细节、排除细节、路由诊断和过量记忆细节会先被压缩或省略。

返回结果增加了机器可读的降级遥测：

- 降级原因与级别；
- 原始估算 Token 和实际模式上限；
- 被省略的区段；
- 保留的 Primary、Deferred、记忆和必要证据数量。

模式上限仍然有效，本次修复没有粗暴提高所有模式的预算。

## V5 真实回归复验

使用五个原始失败目标的冻结 commit，按相同任务、`--budget 6000`、`--route-limit 8`、JSON 输出及关闭引用补全的条件重新执行。

| 目标 | 修复前 | 修复后 | 上限 | 结果 |
| --- | ---: | ---: | ---: | --- |
| `click-2273-local-complete` | 3627，退出 1 | 1132，退出 0 | 2400 | compact |
| `click-2622-high-connectivity` | 3077，退出 1 | 843，退出 0 | 2400 | compact |
| `cobra-2356-local-complete` | 2814，退出 1 | 810，退出 0 | 2400 | compact |
| `cobra-1956-high-connectivity` | 2659，退出 1 | 739，退出 0 | 2400 | compact |
| `fd-1852-local-complete` | 2538，退出 1 | 879，退出 0 | 2400 | compact |

五个目标全部返回结构化路由结果，并至少保留一条 Primary 路径。另有独立回归测试覆盖 5,000 Token guarded 上限的 Markdown 与 JSON 输出。

## 验证

- 五种通用超额固定信封形态，分别验证 Markdown 与 JSON。
- 5,000 Token guarded 信封，分别验证 Markdown 与 JSON。
- `pnpm lint` 通过。
- `pnpm test` 通过，包括 277 项 core 测试、CLI/MCP 测试和保留的研究测试。
- `pnpm build` 通过，包括 npm package CLI 与插件 MCP bundle。

本轮也修复了相邻的 CLI 评估问题：没有提供的分层真值参数现在保持 `undefined`，因此重复传入的 `--changed-file` 不会再被默认空的 core 数组覆盖。

## 声明边界

本次修复排除了预算层面的运行阻塞，但不会改写 V5 的负面结果，也不能证明路由准确率提升、节省 Token、执行更快或已经符合稳定版发布资格。Vitest 等 monorepo 的语义路由问题仍需通用机制修复，并通过全新的预注册测试验证。

原始证据：[`../research/evidence/adaptive-context-budget-contract-repair.json`](../research/evidence/adaptive-context-budget-contract-repair.json)
