# 第 12 轮验证 Attempt 2 Harness 修正说明

## 原因

第一次正式命令在 `assertFrozenInputs` 内停止，当时尚未建立目标临时仓库、尚未构建 baseline，也没有调用任何 Palace。验证器错误地期待 `freezeAttempt: 2`，但第一份验证冻结写的是 `freezeAttempt: 1`。

Create-only 的无效结果、第一份验证冻结与机器可读失败记录都原样保留并绑定 hash。

## 允许修正范围

Attempt 2 只修改：

- validation study 与输出身份从 attempt 1 改为 attempt 2；
- validation freeze 身份从 attempt 1 改为 attempt 2；
- 验证器的 freeze identity 断言和对应完整性测试；
- 绑定失败冻结与无效结果的 amendment provenance。

Candidate 源码、CLI、目标清单、目标顺序、任务、oracle 文件、语义审核、baseline、阈值、预算、重复次数、条件顺序和静态证据边界全部不变。

本修正前，选中任务上的 Palace 调用为 0；产品命令为 0；产品修改为 0。

修正后的 create-only 正式结果路径：

`docs/research/evidence/local-blind-routing-validation-0.4-alpha-round-12-attempt-2.json`
