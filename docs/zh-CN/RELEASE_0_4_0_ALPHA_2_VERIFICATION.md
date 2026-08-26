# Vertex Palace 0.4.0-alpha.2 发布验证

## 结果

alpha.2 的产品与打包门槛已在干净源码 commit `20e797d5558d671e01effd4528fef077d6d78f83` 上通过。这只授权 npm `next` 与 GitHub prerelease，不授权 npm `latest`、稳定 tag 或 Agent 性能主张。

## 已验证契约

- Workspace lint、252 个核心测试、CLI/MCP 测试与完整研究生命周期测试全部通过。
- CLI、MCP、workspace 包、插件 metadata 与 npm tarball 统一回报 `0.4.0-alpha.2`。
- 4 次不确定本地任务都保持 advisory `route-lite`，实际为 1,729 estimated tokens，明确显示缺少 verification，且不强制停止。
- 关闭引用解析后，不透明任务返回结构化 `abstain`、零源码路线与正常退出状态。
- 分层 evaluation 会分别处理核心真值和潜在附属真值，不再混成一个总分。
- 50 条记忆候选下，JSON 与 Markdown 都没有超过 5,000 Token 上限。
- 干净安装没有让 `.palace/` 污染 tracked Git 状态；安装后的 MCP 暴露全部 10 个工具。

机器记录见 [release-candidate-0.4.0-alpha.2.json](../research/evidence/release-candidate-0.4.0-alpha.2.json)。

## 负面边界

Vertex Palace 把本次 53 文件的产品、发布与研究改造当成一个复合任务自评时，核心覆盖率只有 18%，明确附属真值覆盖率为 0%，focus 为 88%，并正确给出 `needs-review` 与 overconfidence 警告。这不是普通编码任务基准，但它公开了一个仍存在的限制：整个仓库的发布编排仍需要明确 checklist，不能依赖单一路线。

## 下一门槛

Round 22 与 Round 23 必须在 candidate 或 baseline 第一次执行前完成哈希冻结。只有两轮全新研究在不修改预注册门槛的情况下连续通过，才可发布稳定 `0.4.0` 与 npm `latest`。
