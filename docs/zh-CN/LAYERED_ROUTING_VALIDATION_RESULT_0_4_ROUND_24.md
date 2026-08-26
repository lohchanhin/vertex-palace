# 分层路由验证结果（0.4.0-alpha.3，第 24 轮）

## 判定

**通过。** Round 24 是修复后 alpha.3 的第一轮全新资格通过，第一次正式观察即通过全部 16 个预注册硬门槛。稳定资格目前为 `1/2`；未改变的 candidate 还必须通过 Round 25，才可授权 stable release。

## 冻结谱系

- 预注册源码提交：`5f3b17032cdc996a730bda4fe306edd1493a8c37`
- Candidate：`vertex-palace@0.4.0-alpha.3`
- Candidate integrity：`sha512-rVwwaZMQNBt8sbJV2Al/vo9RWwPn4NMGMOn159DvHDN8j4CPcVzPjm1M+UpkUGaSMbs5KBPH6RrjrKcnJE9qkA==`
- Baseline：公开 `vertex-palace@0.3.0`
- 设计：12 个目标，每种 condition 重复两次，candidate/baseline 顺序平衡且不并行

Manifest、冻结 GitHub metadata、runner、产品包与门槛都在任一 condition 运行前完成 hash freeze 并推送。

## 结果

| 指标 | 结果 |
| --- | ---: |
| 可访问引用补全 | 6/6 runs |
| 控制任务拒答且零源码文件 | 6/6 runs |
| 可路由实现／测试核心闭合 | 18/18 runs |
| 宏观核心覆盖率 | 1.000 |
| 宏观 route focus | 0.972 |
| 明确附属覆盖率 | 100% |
| 目标路线确定性 | 12/12 |
| 过度自信 runs | 0 |
| 错误强制停止 | 0 |
| tracked-file 污染 | 0 |
| payload 指标分歧 | 0 |
| Candidate 平均交付 Context | 1,724.667 estimated tokens |

所有本地与引用目标都完整命中实现和聚焦测试，三个高连接度目标也都包含明确 contract。一个 Rust 目标额外纳入高连接度 registry，使其单目标 focus 为本轮最低的 `0.75`，仍高于预注册下限 `0.40`。所有 candidate context 均低于 6,000 estimated tokens。

两种产品共同完成 6 个目标；candidate 核心 coverage delta 为 `0.000`，route-focus delta 为 `+0.431`，两个非劣门槛都通过。

## 解释边界

本结果支持这些合成静态路由目标上的 grounding、拒答、证据闭合、focus、校准、确定性与仓库洁净性。Candidate 平均交付 Context 大于 baseline；该数值只作描述，不是模型 Token、时间或效率证据。Round 24 不证明 Agent 性能优势。

机器证据：[layered-routing-results-round-24.json](../research/evidence/layered-routing-results-round-24.json)。

## 下一门槛

在不修改源码、manifest、runner、artifact integrity 或阈值的条件下运行已冻结 Round 25。只有连续两轮通过，才进入 stable `0.4.0` 与 npm `latest` 发布评估。
