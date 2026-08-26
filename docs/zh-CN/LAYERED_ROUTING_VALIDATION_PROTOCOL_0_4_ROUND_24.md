# 分层路由验证协议（0.4.0-alpha.3，第 24 轮）

## 资格角色

Round 24 是显式证据契约完成唯一一次通用修复后的第一轮全新资格研究。Round 22 继续保留为不可改写的 alpha.2 失败结果，其 alpha.3 replay 只属于披露式回归证据；Round 23 因绑定 alpha.2 而退休。在本协议、manifest、runner 与产品包完成 hash freeze 前，不对任何 Round 24 任务运行路由。

## 冻结边界

完整 12 目标清单为 `../research/evidence/layered-routing-targets-round-24.json`。任一 condition 运行前，任务、语言和分层分配、核心真值、明确与潜在附属真值、已解析 GitHub metadata、runner、candidate tarball、公开 baseline package 及数值门槛全部哈希冻结。第一次观察结果不可改写。

Candidate 为 `vertex-palace@0.4.0-alpha.3`，baseline 为公开的 `vertex-palace@0.3.0`。每个目标的两种 condition 各重复两次；candidate/baseline 顺序按目标与 repetition 平衡，而且所有观察顺序执行。

## 目标平衡

本轮包含 3 个本地信息完整任务、3 个冻结 GitHub metadata 任务、3 个高连接度跨文件任务，以及 3 个必须拒答的控制任务。TypeScript、Python、Go、Rust 各有 3 个目标。Round 22-25 的 ID、symbol、实现路径、聚焦测试路径与引用编号不得重复。

正式 GitHub 引用试验只使用 freeze 中哈希的一小时缓存记录。真实 GitHub 联网 smoke 只验证 transport，不能改变正式结果。

## 分层真值

- 核心真值：实现文件与聚焦测试。
- 明确附属真值：任务或冻结 metadata 明确要求的 contract、配置、文档或 changelog。
- 潜在附属真值：只来自隐藏 diff 或项目惯例，单独描述，不进入核心硬门槛。

## 稳定门槛

只有全部门槛通过，本轮才通过：引用补全 100%；控制任务拒答 100% 且零源码抽屉；可路由任务实现／测试核心闭合 100%；宏观核心覆盖率至少 0.90；宏观 route focus 至少 0.70；每个可路由目标 coverage 至少 0.50、focus 至少 0.40；明确附属覆盖率 100%；共同完成目标的 candidate coverage 与 focus 相对 baseline 非劣界限均为 -0.05；零过度自信、零错误强制停止、零 tracked-file 污染、零指标分歧；重复路线确定性一致；candidate context 不超过 6,000 estimated tokens。

## 失败与主张规则

第一次失败结果必须原样提交，并将稳定资格计数归零。显式证据失败类型已经使用一次通用修复机会；若它在两轮全新研究继续出现，就暂停 stable 0.4 并转为架构复审，不能继续增加样本专用规则。Round 24 单独通过仍不足以发布，未改变的 alpha.3 还必须通过全新 Round 25。

本研究只证明静态路由、grounding、拒答与 context contract，不证明 Agent 正确率、Token 节省、工具调用减少或墙钟时间改善。
