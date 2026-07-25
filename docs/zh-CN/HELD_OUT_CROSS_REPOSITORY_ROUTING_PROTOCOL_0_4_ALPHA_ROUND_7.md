# 跨仓库未见路由验证协议（0.4 Alpha，Round 7）

## 状态

本协议在 Round 7 目标 manifest 选中并提交之后预注册，但早于任何候选任务的
第一次 Vertex Palace 调用。冻结产品、manifest、验证 harness、英文与简体中文
协议及合约测试必须先提交，之后才能开始测量。

## 声明边界

本研究只测量静态路由：冻结 Vertex Palace 是否能找到机械选定的改动文件
oracle，同时控制额外文件、校准 confidence 并限制 context payload。

它不运行目标项目测试，也不要求 Agent 真正实现任务，因此不能支持 Agent 正确率、
reported Token 节省、工具调用减少或执行时间声明。仓库对产品研发是未见的，但不
表示底层模型从未见过这些公开代码。

## 冻结输入

- 产品提交：`f61207688badbe07818470a42441a3a966a8bdf0`
- CLI SHA-256：
  `72E18636847227AD81D07132CCC47F1F0E62C279366221F1D2DF5CB04F2D0CFC`
- 选择器提交：`8dfe027063454baf5af915492849c4bcffe3ac6f`
- Manifest 提交：`3f1e3e349afc181690f7a7a5d0739cfb7f768aeb`
- Manifest SHA-256：
  `9234AAB3E64E6EEB5857B6376646078067AA0121CA593DEBBB3275037A307616`
- 仓库池 SHA-256：
  `A5573635E28C7A7A4D10B8847297D2FDD2671D4B24645A35DAAE77AE49459149`
- 任务分类器 SHA-256：
  `C3D787029C019FD64BFB079913F23B58082C38560448A9B9567954ECA9FE1254`
- 冻结运行路径：`packages/` 与 `plugins/vertex-palace/mcp/server.cjs`

验证器会在测量前后检查所有哈希与提交。它不会重新 build，实际测量的是冻结的
`dist/palace.cjs`。

## 冻结目标

create-only Round 7 manifest 按固定顺序选出 8 个任务，四种语言各 2 个。前 8 个
primary 仓库全部成功，另外 8 个 fallback 没有被检查。

| 顺序 | 目标 | 语言家族 | 任务类型 | Oracle 文件 | 辅助文件 |
| ---: | --- | --- | --- | ---: | ---: |
| 1 | execa | JavaScript/TypeScript | bugfix | 2 | 0 |
| 2 | jinja | Python | bugfix | 3 | 1 |
| 3 | go-multierror | Go | feature | 2 | 0 |
| 4 | thiserror | Rust | bugfix | 2 | 0 |
| 5 | node-glob | JavaScript/TypeScript | feature | 2 | 0 |
| 6 | httpcore | Python | bugfix | 5 | 1 |
| 7 | httprouter | Go | feature | 2 | 0 |
| 8 | mio | Rust | bugfix | 3 | 0 |

未经改写的提交标题就是任务，完整合格修改文件集合就是 oracle。Jinja 与 HTTPcore
各有一个受限文档或配置辅助文件，这些文件仍属于必需证据。

## 执行流程

目标按 manifest 顺序逐个执行，不并发。每个目标会：

1. 在系统临时目录物化固定的真实提交与路线提交，并验证完整 Git oracle。
2. checkout 路线提交，删除任何旧 `.palace`，再通过冻结 CLI 运行
   `palace init`、`palace index`、`palace status`。
3. 在显式建立的 warm index 上运行两次正式重复；每次先用冻结 oracle 执行
   `palace evaluate`，再执行 `palace context --auto`。
4. 记录路线成员与顺序、任务类型、coverage、focus、precision、confidence
   校准、context payload、模式、边界和命令耗时。
5. 确认 Palace 没有修改目标仓库的 tracked 文件。

两次重复只用于检查路线成员与顺序是否确定，不是独立样本，也不能用来声明延迟。

## 固定限制与重试

- 目标：8
- 每目标重复：2，共 16 个正式 trial
- Context budget：6,000 estimated tokens
- Route limit：9 个文件
- Maximum drawers：4
- 仓库物化：最多 3 次
- Fresh index：最多 2 次，只有 `EAGAIN`、`ENOMEM`、`ETIMEDOUT` 瞬时失败
  可以重试
- `evaluate` 与 `context` 重试：0
- 全部顺序执行，禁止并发

产品或合约失败不会重试或删掉；setup 与环境失败会以独立类别保留。

## 通过门槛

只有同时满足全部条件才通过：

1. 8 个目标与 16 个 trial 全部完成。
2. 每个 trial 的任务类型都匹配冻结 oracle。
3. 每个目标的实现文件和路径推导聚焦测试，在每个 trial 都完整覆盖。
4. 有辅助文件的目标，其文档/配置辅助面在每个 trial 都完整覆盖。
5. 两次重复的路线顺序与成员完全相同。
6. Macro changed-file coverage 至少 `0.90`。
7. Macro route focus 和独立计算的 route precision 都至少 `0.75`。
8. 每个目标的 focus 与 precision 都至少 `0.50`。
9. Overconfident trial 数为 `0`。
10. 每个 context payload 都不超过 6,000 estimated tokens。
11. selected 与 excluded 执行边界不能重叠。
12. 显式 index 后状态必须 fresh，Palace 结束后目标 tracked worktree 仍干净。

观察结果出现后，不允许删除、改写、替换目标或重新选题。

## 证据保存

验证器只写一个 create-only 结果：

`docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-7.json`

第一次完整结果无论通过、失败或包含环境失败都必须保存。之后若修产品，只能使用
新的、明确标为 disclosed regression 的研究，不能把这次观察重新称为 held out。

## 命令

协议、harness 与测试提交且 tracked worktree 干净后才能运行：

```powershell
node scripts/verify-held-out-cross-repository-routing-round-7.cjs --out docs/research/evidence/held-out-cross-repository-routing-0.4-alpha-round-7.json
```
