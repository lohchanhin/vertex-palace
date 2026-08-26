# 分层路由验证协议（0.4.0-alpha.3，第 25 轮）

Round 25 是未改变的 `vertex-palace@0.4.0-alpha.3` candidate 的第二轮全新资格研究。完整 12 目标清单为 `../research/evidence/layered-routing-targets-round-25.json`。它必须在 Round 24 结果可能改变任何产品、任务、oracle、阈值或 runner 输入之前完成预注册与 hash freeze。

本轮沿用 Round 24 的公开 `vertex-palace@0.3.0` baseline、每种 condition 两次重复、平衡且顺序执行、四种语言、四个任务分层、冻结 GitHub cache 协议、分层真值与数值门槛。所有任务身份与真值路径都未出现在 Round 22-24。

Round 25 只有在以下条件全部满足时才通过：引用补全与控制拒答均为 100%；可路由核心与明确附属闭合均为 100%；宏观核心覆盖率至少 0.90；宏观 focus 至少 0.70；每个可路由 run 的 coverage 至少 0.50、focus 至少 0.40；共同完成目标的 coverage 与 focus 在 -0.05 内非劣；重复路线确定性一致；零过度自信、错误强制停止、tracked-file 污染与指标分歧；context 不超过 6,000 estimated tokens。

第一次观察结果不可改写。只有 Round 24 与 Round 25 使用相同 candidate artifact integrity 且连续通过，才授权 stable `0.4.0` 与 npm `latest`。任一失败都会把资格归零，并且不得修改目标、oracle 或阈值来洗掉失败。

本研究仍只属于静态路由证据。任何 Token、墙钟时间或工具调用性能主张，都必须依赖独立的 24 对真实 Agent A/B。
