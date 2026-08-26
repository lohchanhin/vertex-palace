# 第 19 轮静态验证 Attempt 2 修正说明

## Attempt 1 为什么无效

Attempt 1 已以 create-only 形式保存在 `docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-19-attempt-1.json`。它完成七组配对目标，但 `iniconfig` 无法通过目标物化，因此整轮状态仍是无效。

失败来自通用验证器契约，不是仓库或网络问题：

- 目标选择器把 `git show --format=%B` 的第一条非空行冻结为任务；
- 验证器却用 `git show --format=%s` 与任务比较；
- Git 会把多行首段折叠成 `%s`，因此冻结的 `iniconfig` 任务与折叠标题不相等；
- 物化外层又把所有异常误标为 `environment-or-setup`，并把同一个确定性 assertion 重试三次。

诊断和精确 hash 已保存在 `docs/research/evidence/local-blind-routing-validation-attempt-1-failure-record-0.4-alpha-round-19.json`。

## 观察边界

Attempt 1 已暴露七组目标、每条件 14 次完整 trial，以及 98 次选中任务 Palace CLI 调用。因此 Attempt 2 对这七个目标不是全新的第一次观察。它们的部分 aggregate 会保留为历史证据，但不能当成正式的八目标产品结论。

观察 Attempt 1 后没有调整产品代码。冻结的 candidate 源码树、CLI、baseline、八个目标、整文件 oracle、语义审核、任务顺序、条件顺序、限制、门槛与晋级规则全部不变。

## 允许的 Harness 修正

Attempt 2 只修改通用验证 harness：

1. 按冻结选择器契约，以 `%B` 第一条非空行和冻结任务比较；
2. 把非网络的物化失败分类为 `harness-contract`；
3. 只重试环境或网络物化失败；
4. 写入新的 create-only 结果，并以 hash 保留所有 Attempt 1 产物。

没有删除任务、裁剪 oracle、按结果排除目标、修改语义门槛、修改产品或改变并发方式。

## 修正后输出

修正验证器只写一份新的 create-only 结果：

`docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-19-attempt-2.json`

除本说明明确修正的 harness 与披露的先前部分观察外，第 19 轮基础协议仍然有效。
