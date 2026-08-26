# Vertex Palace 0.4.0-alpha.3 Release-Candidate 验证

## 结果

alpha.3 产品与打包门槛已在干净提交 `c22c8e41e8f415cd182513c1cf7a902ca86ad564` 上通过。这证明修复后的源码可以确定性地产生 prerelease artifact，但不授权 npm `latest`、stable tag，也不构成 Agent Token、速度或正确性主张。

## 已验证契约

- 未修改代码的完整套件通过：core 257/257、CLI/MCP 4/4、research tests 239 passed，另有 2 项按协议跳过。
- workspace lint、build、MCP smoke、包版本一致性与临时目录安装通过。
- CLI、MCP、workspace packages、plugin metadata 与打包 artifact 一致报告 `0.4.0-alpha.3`。
- 4 次重复的不确定本地任务都保持 advisory `route-lite`，明确暴露缺失验证，而且没有强制早停。
- 关闭 reference resolution 的不透明任务返回结构化 `abstain`、零源码路线和正常退出状态。
- 干净安装不会把 `.palace/` 写入 tracked Git 状态，并暴露全部 10 个 MCP tools。

候选包 integrity 为 `sha512-rVwwaZMQNBt8sbJV2Al/vo9RWwPn4NMGMOn159DvHDN8j4CPcVzPjm1M+UpkUGaSMbs5KBPH6RrjrKcnJE9qkA==`。完整机器记录见 [release-candidate-0.4.0-alpha.3.json](../research/evidence/release-candidate-0.4.0-alpha.3.json)。

## 研究边界

Round 22 在唯一一次通用修复后的 post-observation replay 已通过，但它只能作为披露式回归证据。稳定资格仍为零。Round 23 绑定失败的 alpha.2，因此退休，不能用于 alpha.3 的资格判定。

## 发布边界

本验证不会创建 npm package、Git tag、GitHub release 或 marketplace 默认版本。只有完成针对修复候选的新预注册路由门槛后，alpha.3 才可替换 npm `next`；npm `latest` 必须等连续两轮全新研究通过，在此之前继续保持 `0.3.0`。
