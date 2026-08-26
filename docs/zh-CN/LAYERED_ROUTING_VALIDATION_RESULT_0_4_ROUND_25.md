# 分层路由验证结果（0.4.0-alpha.3，第 25 轮）

## 判定

**通过。** Round 25 在第一次正式观察中通过全部 16 个预注册硬门槛。加上已通过的 Round 24，未改变的 alpha.3 artifact 已连续完成两轮全新资格研究；静态路由稳定资格达到 `2/2`。

这授权我们在 stable artifact 完成全部 release verification 后，准备 stable `0.4.0`、npm `latest` 与 marketplace 更新；但不授权 Token、速度、工具调用或端到端 Agent 正确性主张。

## 冻结谱系

- 预注册源码提交：`5f3b17032cdc996a730bda4fe306edd1493a8c37`
- Candidate：`vertex-palace@0.4.0-alpha.3`
- Candidate integrity：`sha512-rVwwaZMQNBt8sbJV2Al/vo9RWwPn4NMGMOn159DvHDN8j4CPcVzPjm1M+UpkUGaSMbs5KBPH6RrjrKcnJE9qkA==`
- Baseline：公开 `vertex-palace@0.3.0`
- 设计：12 个全新目标，每种 condition 重复两次，顺序平衡且不并行

Round 24 结果没有改变 Round 25 的 manifest、runner、产品包、门槛或 freeze。

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
| Candidate 平均交付 Context | 1,721.750 estimated tokens |

每个本地与冻结引用目标都命中实现和聚焦测试，每个高连接度目标也包含明确 contract。一个 Python 目标额外纳入高连接度 registry，focus 为 `0.75`；其他可路由目标 focus 均为 `1.00`。所有 candidate context 都低于 6,000 estimated tokens。

两种产品共同完成 6 个目标；candidate 核心 coverage delta 为 `0.000`，route-focus delta 为 `+0.320`，两个预注册非劣门槛都通过。

## 两轮资格总结

| Round | 核心 coverage | Route focus | 控制拒答 | 引用补全 | 硬门槛 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 24 | 1.000 | 0.972 | 6/6 | 6/6 | 16/16 |
| 25 | 1.000 | 0.972 | 6/6 | 6/6 | 16/16 |

合计 96 次顺序观察中，修复候选的路线保持确定性，没有 tracked-file 污染、过度自信或错误强制停止。

## 主张边界

这只建立预注册静态路由 release gate。Candidate 平均 Context 仍大于 baseline，而且两轮都没有执行 Agent。性能主张仍必须依赖独立的 8 任务、24 对随机交叉 Agent A/B，并满足正确率非劣门槛与配对 bootstrap 区间。

机器证据：[layered-routing-results-round-25.json](../research/evidence/layered-routing-results-round-25.json)。

## 发布决定

从已取得资格的源码准备 stable `0.4.0`，执行 lint、全部测试、build、MCP smoke、release-candidate 临时安装、版本一致性与真实 GitHub transport smoke；记录 stable 包 integrity 后才发布 npm。npm `latest`、Git tag/GitHub release 与 marketplace 默认版本应同步更新，并保持 alpha 与失败轮次证据不可改写。
