# Vertex Palace 0.4.0 发布验证

## 结果

Vertex Palace `0.4.0` 已通过完整产品、打包、静态路由资格与公开 GitHub transport 门槛。这授权 stable Git tag、GitHub release、npm `latest` 与 marketplace 默认版本更新。

它不授权“Palace 普遍减少端到端 Agent Token、墙钟时间、工具调用或正确性错误”的主张；这些性能主张仍必须通过独立随机 Agent A/B。

## 产品验证

- Workspace lint 与 build 通过。
- Core tests 257/257；CLI/MCP tests 4/4。
- Research tests 242 passed，另有 2 项按协议跳过。
- MCP smoke 暴露全部 10 个工具并报告版本 `0.4.0`。
- Root package、workspace packages、shared runtime constant、plugin manifest、plugin MCP pin、CLI 与 MCP 版本一致。
- 干净临时目录安装报告 `vertex-palace@0.4.0`，没有把 `.palace/` 写入 tracked Git 状态，并成功启动安装包内的 MCP server。

Stable package shasum 为 `8b50ca082cce86618a774ae81668c1fd965d722c`，integrity 为 `sha512-s81a+d17EfMhS/Kqszk54DDxYxjTYQ5PnhMHWicP2OEif2H4gSE0Tu+8lAU9ijeAid0fjACqNk9EEGD2IrhOHQ==`。机器证据：[release-candidate-0.4.0.json](../research/evidence/release-candidate-0.4.0.json)。

## 全新资格研究

未改变的 alpha.3 artifact 连续通过两轮全新预注册研究：

| Round | 核心 coverage | Route focus | 引用补全 | 控制拒答 | 硬门槛 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 24 | 1.000 | 0.972 | 6/6 | 6/6 | 16/16 |
| 25 | 1.000 | 0.972 | 6/6 | 6/6 | 16/16 |

合计 96 次顺序观察中，过度自信、错误强制停止、tracked-file 污染与 payload 指标分歧均为零；candidate context 都低于 6,000 estimated tokens。Round 21 与 Round 22 继续保留为不可改写的负面结果；修复后的 Round 22 replay 只属于披露式回归证据，不计入稳定资格。

## 真实 GitHub Transport

可复现 smoke 主动清空 `GH_TOKEN` 与 `GITHUB_TOKEN`，匿名读取公开 `microsoft/vscode#1`，随后从一小时本地 cache 再次解析同一引用。两次内容 hash 一致，只创建一个缓存文件，而且输出与 cache 都没有凭证标记。机器证据：[github-reference-smoke-0.4.0.json](../research/evidence/github-reference-smoke-0.4.0.json)。

## 发布清单

- 将最终验证提交标记为 `v0.4.0` 并推送 tag。
- 从该 tag 建立 GitHub release，并保留上述主张边界。
- 将完全相同的 stable package 发布为 npm `latest`；确认 registry integrity 与干净安装后，才把 npm `next` 移到 `0.4.0`。
- Tag 可访问后，marketplace 默认版本保持 `v0.4.0`。
