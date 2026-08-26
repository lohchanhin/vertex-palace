# Vertex Palace 0.4 非循环架构

## 目的

`0.4.0-alpha.2` 不再采用“观察一个仓库失败，再补一条专案规则”的方式，而是落实三个可复用的产品契约：先补全任务事实、只为缺失证据扩张、把不同真值层分开评价。生产代码不得包含基准仓库名、issue 编号或特定项目路径规则。

## 一、任务补全

每条路线都会记录 `taskGrounding.status`、`taskGrounding.resolutionStatus` 与 `decision`。

- `local`：任务含本地文件、强代码标识符，或能匹配产品节点的领域词。
- `resolved`：原本不透明的 GitHub issue 或 PR 已通过有限元数据补全。
- `unresolved`：继续路由只能靠猜，因此返回 `abstain`，源码抽屉为零。

每次最多解析两个 GitHub 引用，优先完整 URL 和明确标注的 issue/PR，再处理裸编号。工具只调用 GitHub issue API，总超时五秒且不重试。公共仓库匿名读取；私有仓库依次使用 `GH_TOKEN`、`GITHUB_TOKEN`。凭证不会进入缓存、输出或错误。规范化内容最多 8 KiB，在 `.palace/cache/references/` 保存一小时。

`referencePolicy: "off"` 会关闭远端解析。即使强制指定 context mode，也不能越过拒答。

## 二、证据增益扩张

关系候选使用统一的预注册公式：

```text
0.45 * taskAffinity
+ 0.30 * relationStrength
+ 0.25 * facetGain
- 0.20 * degreePenalty
- 0.25 * redundancy
```

`taskAffinity` 相对于最高任务分数；`degreePenalty = min(1, log2(1 + sourceDegree) / 8)`。候选必须补充缺失角色、任务词或因果来源，或者同时达到任务相关度 0.65 和关系强度 0.75。高连接度文件不能只凭关系进入路线。

当实现、聚焦测试和所有明确要求角色都已存在，最佳剩余增益低于 0.55 就停止。关系扩张对每种明确附属角色最多加入一个文件。

证据不足本身不会再自动扩大为 `full-palace`。没有真实的跨栈、租户、记忆冲突、公开契约、广泛范围或测试修改风险时，结果保持 `route-lite + advisory`，估算 Token 上限 2400，且 `stopEnforced=false`。

## 三、分层评价

评价分为：

- 核心真值：实现文件和聚焦测试。
- 明确附属真值：任务或已解析元数据明确要求的 README、CHANGELOG、配置或契约文件。
- 潜在附属真值：只从隐藏 diff 或项目惯例得知的文件。

核心真值与明确附属真值属于发布门槛；潜在附属真值只作说明，不能让核心完整的路线变成失败。置信度校准使用核心覆盖率。旧的 `changedFiles` 输入继续兼容；没有提供分层输入时，它会映射为核心真值。

## 研究边界

Round 21 保持原样，继续作为公开负面结果与回归集。即使已知案例改善，也不能证明 0.4 合格。只有连续两轮全新预注册研究在观察后不修改目标、oracle、阈值或产品代码并通过，alpha.2 才能从 npm `next` 升为 `latest`。

真实 Agent 性能属于另一项实验。Vertex Palace 可以凭安全、可审计的路由价值发布，但不能因此宣称省 Token 或更快。只有顺序平衡、重复执行的 Agent A/B 中，某项配对 95% bootstrap 区间完全位于有利方向，才可宣传对应性能优势。
