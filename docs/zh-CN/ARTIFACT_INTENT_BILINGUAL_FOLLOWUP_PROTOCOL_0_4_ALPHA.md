# 资料族意图双语跟进协议（0.4 Alpha）

## 状态

本协议在第一次正式观察前预注册。协议与验证脚本必须先提交，之后才可以执行证据命令。

## 研究问题

候选版本 `0b6a0fd92f43a74c983663cd32f937087e3ec923` 是否修复上一轮发现的简体中文递归资料族失败，同时不破坏英文路由、旧资料族、产品修复、已观察的外部仓库，以及不存在资料族时的置信度校准？

## 声明边界

这是已观察目标的静态路由回归与候选版本自审，不是未见目标验证，也不衡量 Agent 端到端正确率、Token 或执行时间。通过只代表可以进入未见目标测试，不代表已经证明 Agent 性能提升。

## 冻结候选

- 产品 commit：`0b6a0fd92f43a74c983663cd32f937087e3ec923`
- CLI：验证前由冻结产品路径重新构建 `dist/palace.cjs`
- 预算：6,000 estimated input tokens
- 路由上限：9 个文件
- Drawer 上限：4
- 重复次数：每个目标连续执行 2 次
- 并发：无

验证脚本会拒绝冻结产品 commit 与当前产品路径之间的任何差异。协议、验证脚本、报告和证据文件不属于冻结产品路径。

## 测试目标

外部回归集合继续使用固定 commit 的 Zod、Requests 和 p-limit 已观察任务，文件真值不变。

候选版本自审预先固定九个目标：

1. 原始跨仓库资料族，英文。
2. 原始跨仓库资料族，简体中文。
3. post-self-audit 递归资料族，英文。
4. post-self-audit 递归资料族，简体中文，并使用上一轮正式回归失败的原始任务文本。
5. 复合产品路由修复。
6. release vocabulary 产品路由修复。
7. 当前具名资料族产品修复。
8. 不存在的 post-cobalt-harbor 资料族，英文负对照。
9. 不存在的 post-cobalt-harbor 资料族，简体中文负对照。

## 通过门槛

每个目标必须完成两次连续实验，路由文件完全一致，不修改 tracked worktree，selected 与 excluded 边界不得重叠，context payload 不得超过 6,000 estimated tokens。

- 外部仓库：预期 changed-file coverage 与 accepted-route precision 都必须为 1.00。
- 旧资料族与递归资料族：coverage 必须为 1.00，route focus 至少 0.85，accepted-route precision 必须为 1.00，路由最多 7 个文件。
- 复合产品修复与 release-vocabulary 产品修复：coverage、focus、accepted-route precision 都必须为 1.00，路由最多 7 个文件。
- 当前具名资料族产品修复：coverage、focus、accepted-route precision 都必须为 1.00，路由最多 4 个文件。
- 两个不存在资料族负对照：预期 coverage 必须为 0，route confidence 不得超过 0.15，accepted-route precision 必须为 1.00，路由最多 7 个文件。
- 所有完成的 trial 都不得出现 overconfident。
- 显式 index 后，候选状态必须立即为 fresh。

任何门槛失败都代表候选版本不能进入未见目标验证。失败结果必须保留，不能重新解释成通过。

## 证据保存

第一次正式观察必须建立在：

`docs/research/evidence/artifact-intent-bilingual-followup-0.4-alpha.json`

脚本使用排他建立模式，若文件已存在就拒绝覆盖。原始输出会原样提交、计算 SHA-256，再由独立的英文与简体中文结果报告解释。

## 执行命令

只有在本协议与 `scripts/verify-artifact-intent-bilingual-followup.cjs` 已提交后才能执行：

```powershell
node scripts/verify-artifact-intent-bilingual-followup.cjs --out docs/research/evidence/artifact-intent-bilingual-followup-0.4-alpha.json
```

