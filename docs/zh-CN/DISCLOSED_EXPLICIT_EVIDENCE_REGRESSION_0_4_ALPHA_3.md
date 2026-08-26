# 已披露显式证据回归（0.4.0-alpha.3）

## 范围

这是唯一一次通用产品修复后，对不可变 Round 22 目标进行的 post-observation replay。它不能让稳定 0.4 获得资格，不能替换 Round 22 原始失败，也不能证明 Agent 性能。

## 产品修复

本次只加入一个通用任务证据契约：任务或已解析 GitHub metadata 明确写出的仓库路径，会在评分与剪枝之后、证据闭合与置信度之前强制物化；路径不存在或预算容不下时，closure 必须保持 insufficient。裸数字 incident ID 不再建立本地 grounding。生产逻辑没有加入仓库名、issue 编号或目标专用路径。

## Attempt 1：原样保留的测量失败

第一次披露回归只报告 0.500 宏观核心覆盖率。只读检查发现产品已把 focused test 与 contract 放进顶层 `deferredReferences`，但研究 runner 只统计 Primary、已加载 context drawer 与旧的嵌套路由形状。原始失败保存在 [attempt 1](../research/evidence/layered-routing-regression-round-22-0.4.0-alpha.3.json)。它属于 harness 测量失败，不是产品证据。

## Attempt 2：修正后的披露结果

修正后的 route extractor 会统计顶层 `deferredReferences`，没有修改目标任务、真值层、产品代码或阈值。

| 指标 | alpha.3 结果 |
| --- | ---: |
| 引用补全 | 6/6 runs |
| 控制任务拒答 | 6/6 runs |
| 可路由核心闭合 | 18/18 runs |
| 宏观核心覆盖率 | 1.000 |
| 宏观 route focus | 0.972 |
| 明确附属覆盖率 | 100% |
| 目标路线确定性 | 12/12 |
| 错误强制停止 | 0 |
| 过度自信 runs | 0 |
| tracked-file 污染 | 0 |
| Candidate 平均交付 Context | 1,726.250 tokens |

alpha.3 与 0.3.0 共同完成 6 个目标；配对 coverage delta 为 `0.000`，route-focus delta 为 `+0.431`，方向有利于 alpha.3。交付 Context 仅作描述，不是 Agent Token 或速度主张。

机器证据：[attempt 2](../research/evidence/layered-routing-regression-round-22-0.4.0-alpha.3-attempt-2.json)。

## 产品验证

- 第一次完整测试在系统资源瞬时争用时，有 5 个大型 router 案例触发既有的 15 秒 timeout；这 5 项单独重跑均在 0.8-2.0 秒内通过，随后未修改代码的完整套件通过：core 257/257、CLI/MCP 4/4、research tests 239 passed，另有 2 项按协议跳过。
- `pnpm lint`、`pnpm build`、MCP smoke、版本一致性与临时目录 release-candidate 安装都通过，版本为 `0.4.0-alpha.3`。
- release-candidate 包的 integrity 与披露回放候选一致：`sha512-rVwwaZMQNBt8sbJV2Al/vo9RWwPn4NMGMOn159DvHDN8j4CPcVzPjm1M+UpkUGaSMbs5KBPH6RrjrKcnJE9qkA==`。
- 本次披露回归没有发布 npm package、Git tag 或 GitHub release。

## 决定

已知失败类型已经修复，但稳定资格仍是零。alpha.3 必须通过两轮全新、预注册、未观察研究。Round 23 仍绑定失败 alpha.2，因此退休，不能用于 alpha.3 的稳定资格。
