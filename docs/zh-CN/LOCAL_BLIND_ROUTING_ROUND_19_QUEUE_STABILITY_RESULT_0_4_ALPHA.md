# 本地盲测路由第 19 轮候选队列稳定性结果（0.4 Alpha）

## 结果

attempt 1 检查了 31/32 个仓库，在 `memchr` 遇到本机 Git inspection error。attempt 2
使用完全相同的冻结源码、仓库池、选择器、顺序和规则，完成 32/32 个仓库并产生 99 个机械
候选。两次对候选任务的 Palace 调用都保持为 0。

针对相同 pinned history 独立重跑 `memchr` 命令时，exit code 为 0，commit message 与
attempt 1 stdout 相同。attempt 2 扫描 279 个 `memchr` commits，合格候选为 0。因此第一次
失败归类为不可重现的瞬时本机 Git inspection failure，不是候选选择或产品结果。

## 确定性检查

对两次都成功检查的 31 个仓库，以下项目全部一致：

- candidate ID 与 newest-first rank；
- route commit 与 ground-truth commit；
- changed files、实现/测试表面和完整 diff hunks；
- rejection counts；
- scanned commit counts。

语义差异为 0。两次候选总数都是 99，因为 `memchr` 没有贡献候选。

## 已披露限制

coherence packet hash 纳入了队列运行时的 `generatedAt`。因此语义完全相同的 packet 在重跑
时会得到不同的 `packetSha256`。第 19 轮会绑定 attempt 2 的精确 bytes 与 hash 进行审核，
所以目标身份与顺序仍固定；但 byte-for-byte 重跑可复现性弱于预期。必须在第 19 轮首个结果
保存后修复该 harness 缺陷，不得改写本证据。
