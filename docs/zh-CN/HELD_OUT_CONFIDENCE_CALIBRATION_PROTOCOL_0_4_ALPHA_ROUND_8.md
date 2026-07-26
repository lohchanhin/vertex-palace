# 未见置信度校准协议（0.4 Alpha，Round 8）

## 状态

本协议在 Round 8 目标 manifest 已选择并提交之后预注册，但早于任何入选任务的
第一次 Vertex Palace 调用。冻结基线、候选、manifest、成对验证器、本协议、
简体中文版本和契约测试必须先提交，之后才能开始测量。

## 声明边界

本研究在同一批全新任务上，测量两个冻结 Vertex Palace 版本的静态路线、置信度
校准、自适应模式和实际交付上下文。它不运行目标项目测试，也不要求 Agent 实现
任务，因此不能证明 Agent 正确率、reported Token 节省、工具调用减少或总耗时
改善。两次重复只检查确定性，不是独立统计样本。

这些仓库没有用于候选研发或先前研究池；但这不表示底层模型从未见过这些公开
仓库。

## 冻结输入

| 输入 | 冻结值 |
| --- | --- |
| 基线产品提交 | `228c3bde47f6930023496fdd0a54d43dba10091f` |
| 基线 CLI SHA-256 | `E81774B89C3A6FAED83788335688EFCBC8B4D17DEA25CA002097FF1F9125318F` |
| 候选产品提交 | `1a02d89269acb36473db3ad39badab9fe338a4a3` |
| 候选 CLI SHA-256 | `49F44D09551222A2CB8D3BEEDBDA4E374A507C30DCA681D4D9CC0E57C6DB7747` |
| 选择器提交 | `56c006f36b1b83f1b5756d071ce6f0f3dcdd57e5` |
| Manifest 提交 | `93d9ae52ceb68f65dc69ec76cee96e8e752eb84a` |
| Manifest SHA-256 | `6678CE22935F938593C9F950636795E3295D18C9AC57D1C1E7A068B145214466` |
| 仓库池 SHA-256 | `118644384D9E099E0833E36900ED5A7E10648827FF4C2DE5AF40CE11A0018158` |
| 任务分类器 SHA-256 | `C3D787029C019FD64BFB079913F23B58082C38560448A9B9567954ECA9FE1254` |

候选使用当前冻结的 `dist/palace.cjs`。验证器在测量前后都会核对哈希，并确认
`packages/` 与 `plugins/vertex-palace/mcp/server.cjs` 仍和候选提交一致。

基线会在临时本地 shared clone 中重建一次，命令为
`pnpm install --offline --frozen-lockfile --ignore-scripts`，然后运行
`pnpm build`。任何目标任务交给 Palace 前，基线 CLI 必须匹配冻结哈希。如果本机
离线 package store 不完整，它属于环境或 setup 失败，不属于产品结果。

## 冻结目标

Create-only Round 8 manifest 按绑定顺序选择了 8 个任务，每种语言家族恰好 2 个。
Regex 与 Hashbrown 没有合格提交；Hyperium HTTP 提供第二个 Rust 目标。选择阶段
没有 setup 失败，Palace 调用为 0。

| 顺序 | 目标 | 语言家族 | 任务类型 | Oracle 文件 | 实现 | 路径推导测试 |
| ---: | --- | --- | --- | ---: | ---: | ---: |
| 1 | yargs | JavaScript/TypeScript | bugfix | 2 | 1 | 1 |
| 2 | sqlalchemy | Python | bugfix | 3 | 2 | 1 |
| 3 | zap | Go | bugfix | 2 | 1 | 1 |
| 4 | sinon | JavaScript/TypeScript | bugfix | 2 | 1 | 1 |
| 5 | rich | Python | bugfix | 2 | 1 | 1 |
| 6 | viper | Go | bugfix | 3 | 2 | 1 |
| 7 | crossbeam | Rust | feature | 4 | 2 | 2 |
| 8 | http | Rust | bugfix | 2 | 1 | 1 |

未经改写的提交标题就是任务，完整合格修改文件集合就是 oracle。测试角色由路径
推导，不表示测试断言已经实际执行。

## 成对执行

目标按 manifest 顺序逐个执行，条件永不并发。偶数索引按基线、候选顺序运行，
奇数索引按候选、基线顺序运行，形成 4 个 AB 与 4 个 BA 目标。

每个目标的验证步骤：

1. 物化一个固定源仓库，并核对完整 Git oracle。
2. 为基线与候选分别建立独立的本地 shared clone，避免 tracked 文件或
   `.palace` 状态跨条件污染。
3. 删除 `.palace`，再使用该条件的冻结 CLI 运行 `init`、`index` 与 `status`。
4. 正式重复两次；每次先用冻结 oracle 运行 `evaluate`，再在明确 warm index 下
   运行 `context --auto`。
5. 依据路线置信度与 changed-file coverage 独立重算校准，并记录路线、模式、
   边界、上下文字节和 estimated tokens。
6. 核对两次路线顺序与成员完全一致，并确认目标 tracked 文件保持干净。

## 固定限制与重试政策

- 目标：8
- 条件：基线与候选
- 每目标、每条件重复：2
- 正式观察：每条件 16 条，总计 32 条
- 上下文预算：6,000 estimated tokens
- 路线限制：9 个文件
- 最大 drawers：4
- 仓库物化最多尝试 3 次
- Fresh index 最多尝试 2 次，而且只有 `EAGAIN`、`ENOMEM` 或 `ETIMEDOUT`
  瞬时失败可以重试
- `evaluate` 与 `context` 重试：0
- 全部顺序执行，禁止并发

产品或契约失败不会重试或剔除；环境/setup、harness 与产品发现会在结果中分开。

## 校准定义

独立观察误差定义为 `confidence - changed-file coverage`。预注册容差为 `0.15`：

- 大于 `+0.15`：过度自信；
- 小于 `-0.15`：信心不足；
- 其余：校准良好。

报告会在 trial 与 target 两层列出平均绝对误差、错误高置信和错误低置信数量。
成对结论只使用每个目标第一次确定性重复，避免把重复运行伪装成独立样本。

当 observed changed-file coverage 低于 `0.90` 时，`bypass` 或 `route-lite` 属于
不安全窄模式。降低置信度可能选择更宽模式并增加上下文，因此上下文差值只作为
成本报告，不能冒充 Token 节省。

## 产品门槛与成对结论

基线与候选使用相同的描述性路线门槛：

1. 该条件完成 8 个目标与 16 条试验。
2. 任务类型、实现、路径推导测试与任何辅助文件覆盖完整。
3. 两次重复的路线顺序与成员确定一致。
4. Macro coverage 至少 `0.90`；macro focus 与 precision 至少 `0.75`；每个目标
   focus 与 precision 至少 `0.50`。
5. 过度自信试验为 0。
6. 上下文不超过 6,000 estimated tokens，边界不重叠，明确索引保持 fresh，
   目标 tracked 文件保持干净。

基线未通过产品门槛只是比较结果，不会使研究无效；候选门槛状态单独报告。

成对校准结论只使用每目标一次结果：

- `supported`：错误高置信目标减少，错误低置信与总错误校准目标不增加，平均绝对
  误差不增加，路线不改变，而且不安全窄模式不增加；
- `tradeoff`：错误高置信减少，但至少一项错误低置信或误差非劣条件失败；
- `no-difference`：目标层校准数量与平均绝对误差不变；
- `regression`：路线改变、不安全窄模式增加，或没有达到必要改善且校准误差变差；
- `mixed` 或 `incomplete`：前述规则无法形成干净结论。

模式变化与上下文成本差值会和校准结论分开报告。

## 状态与证据保存

环境/setup 或 harness 失败会令研究状态成为 `invalid`。负面、无差异或混合产品
结果仍然是科学上有效的 `completed` 研究，不能改写成环境失败。

验证器只写一个 create-only 结果：

`docs/research/evidence/held-out-confidence-calibration-0.4-alpha-round-8.json`

首次结果必须原样保存，不能删除、改写、替换或重新路由目标。任何后续修复必须
使用另一个明确命名的公开回归研究，不能把 Round 8 重新标成未见。

## 命令

协议、成对验证器与测试全部提交，而且 tracked worktree 干净后才能运行：

```powershell
node scripts/verify-held-out-confidence-calibration-round-8.cjs --out docs/research/evidence/held-out-confidence-calibration-0.4-alpha-round-8.json
```
