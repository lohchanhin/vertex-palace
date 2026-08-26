# 第 12 轮披露后 Subject-Owner Closure 修复结果（0.4 Alpha）

状态：披露后的事后回归；核心修复稳定，完整 auxiliary gate 仍失败。

## 声明边界

正式、对 candidate 保持 held-out 的第 12 轮仍然是**失败**，且不可改写。正式
candidate 只通过 3/8 目标、只有 4/8 核心面完整，并出现 6 个 overconfident trials。
下面 Attempt 1-5 都发生在失败已经被观察之后，不能抹除正式结果，也不能证明 Agent
正确率、回报 Token、工具调用数或执行时间改善。

## 最终披露结果

Attempt 5 精确复现最佳的 Attempt 4：

- 8/8 目标完成并通过各自的披露后检查。
- 8/8 implementation/test 核心面完整。
- Target-macro core coverage：`1.000`。
- Target-macro changed-file coverage：`0.958`。
- Target-macro route focus：`0.771`；core focus：`0.729`。
- 最低单目标 coverage：`0.667`；最低 focus：`0.500`。
- Overconfident、unsafe narrow、unsafe enforced-stop、指标不一致、
  evaluate/context 路线不一致、目标 tracked 文件变化全部为 0。
- 最大静态交付 context 估算 `5,937` Tokens，低于 `6,000` 上限。

完整 gate 仍然**失败**，唯一原因是 bounded auxiliary coverage 只有 `1/2`：
Blinker 的 owner 文档已找回，Bat 的 `CHANGELOG.md` 仍未命中。

## 修复进展

| Attempt | 通过 | Core 完整 | Auxiliary | Macro coverage | Core coverage | Macro focus | Overconfident | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 5/8 | 5/8 | 0/2 | 0.750 | 0.813 | 0.615 | 0 | FAILED |
| 2 | 7/8 | 8/8 | 0/2 | 0.917 | 1.000 | 0.690 | 0 | FAILED |
| 3 | 8/8 | 8/8 | 0/2 | 0.917 | 1.000 | 0.717 | 0 | FAILED |
| 4 | 8/8 | 8/8 | 1/2 | 0.958 | 1.000 | 0.771 | 0 | FAILED |
| 5 | 8/8 | 8/8 | 1/2 | 0.958 | 1.000 | 0.771 | 0 | FAILED |

## Attempt 5 各目标

| 目标 | 路线文件 | Changed coverage | Core coverage | Focus | 主要观察 |
| --- | ---: | ---: | ---: | ---: | --- |
| redux | 4 | 1.000 | 1.000 | 0.500 | 找回 `createStore` owner test，保留两个 contract/runtime 支持。 |
| blinker | 3 | 1.000 | 1.000 | 1.000 | 精确命中 `base.py`、`test_signals.py` 与 owner 文档。 |
| sqlx | 4 | 1.000 | 1.000 | 0.500 | 两个有独立证据的实现各自保留 owner test。 |
| bat | 2 | 0.667 | 1.000 | 1.000 | 核心实现/测试精确，changelog 仍缺失。 |
| pino | 4 | 1.000 | 1.000 | 0.500 | 找回 redaction owner/test，并保留两个 runtime 支持。 |
| packaging | 2 | 1.000 | 1.000 | 1.000 | 精确 implementation/test pair。 |
| afero | 2 | 1.000 | 1.000 | 1.000 | 精确 implementation/test pair。 |
| notify | 3 | 1.000 | 1.000 | 0.667 | 完整 oracle 加一个 package runtime 支持。 |

## Bat Auxiliary 可预测性边界

在 Bat 冻结 route commit `af1f53d9a977154216d01435991fe33631b74713`，索引中
`tests/integration_tests.rs` 与 `src/printer.rs` 有直接测试/实现关系，但
`CHANGELOG.md` 与两者都没有关系。

可达 Git 历史中：

- 595 个 commit 触及 `CHANGELOG.md`。
- 225 个 commit 触及 `src/printer.rs`。
- 223 个 commit 触及 `tests/integration_tests.rs`。
- 33 个 commit 同时触及 changelog 与 printer，占 printer 历史 `14.67%`。
- 65 个 commit 同时触及 changelog 与 integration tests，占 test 历史 `29.15%`。
- 18 个 commit 同时触及三个文件。

这不表示 changelog 永远无用，而是表示冻结任务没有提供足够有区分力的自动加入
信号。为了让披露 gate 变绿而给每个 bugfix 强塞 changelog，会在其他任务中稳定
降低 focus。因此这里保留为已记录的预测边界。

机器可读审计：
[Bat auxiliary predictability](../research/evidence/disclosed-round-12-bat-auxiliary-predictability-audit-0.4-alpha.json)。

## 跨轮回归

同一产品状态在 Round 11 Attempt 7 通过披露回归门槛：8/8 核心完整、coverage
`1.000`、macro focus `0.701`，且没有安全或过度自信失败。这只证明兼容性，因为
两轮对当前 candidate 都已经披露。

## 证据完整性

- 正式 Round 12 SHA-256：
  `4A7D6DBB68FBD6C1AEA3CD3159A092E5C2E8D6931187533F827A55BA6B1529D3`
- 披露后 Attempt 5 SHA-256：
  `C5D39DE53662FBB7CC76B13CA991A9ACB6AB70C0DABE2229F0CE25C8D94C3F37`
- 正式与披露证据都使用 create-only 输出路径。
- Attempt 5 的八个目标仓库全部保持 tracked worktree clean。

证据文件：

- [正式 Round 12 结果](../research/evidence/local-blind-routing-validation-0.4-alpha-round-12-attempt-2.json)
- [披露后 Attempt 5](../research/evidence/disclosed-routing-round-12-after-subject-owner-closure-repair-attempt-5-0.4-alpha.json)

## 决策

通用 subject-owner 修复已经适合进入下一轮新鲜静态路由验证，但还不能形成 Agent
效率结论。下一轮预注册应把 core 与 auxiliary gate 分开：核心路由只评价可由任务
与仓库关系推断的 implementation/test 证据；changelog 或文档只有在冻结任务或仓库
图中存在可观察信号时才列为强制 auxiliary。
