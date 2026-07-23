# 已公开跨仓库路由开发回归（0.4 Alpha，第四轮）

## 结论

**失败。候选版本 `569f7c5` 不能晋级新的 held-out 验证，也不能进入 Agent A/B。**

这次修复让静态聚合指标有所改善，但八个目标只有三个通过。顺序执行的 `16/16`
次试验全部完成，没有环境、初始化或 harness 故障。因此，在本协议下剩余失败可以明确
归类为产品路由问题。

这八个任务已经公开，并被用于开发修复版本。所以本结果属于开发回归，不是 held-out
或泛化证据。它没有执行目标仓库测试，也不能支持 Agent 正确率、Token、工具调用次数或
wall time 的声明。

## 修复前后

| 指标 | 原始第四轮 | 修复后 | 门槛 |
| --- | ---: | ---: | ---: |
| 通过目标 | 2/8 | 3/8 | 8/8 |
| 完成 trials | 16/16 | 16/16 | 16/16 |
| Macro changed-file coverage | 0.521 | 0.584 | >= 0.900 |
| Macro route focus | 0.375 | 0.449 | >= 0.750 |
| Macro route precision | 0.375 | 0.448 | >= 0.750 |
| 路线文件数 | 34 | 31 | 仅记录 |
| Overconfident trials | 6 | 6 | 0 |
| 环境／harness 故障 | 0 / 0 | 0 / 0 | 0 / 0 |

聚合指标方向正确，但改善幅度很小，没有通过任何路由质量晋级门槛。路线更短也不等于
路线更好：aiohttp 从六个文件缩到四个文件时，同时删掉了一个必要测试。

## 冻结证据

| 证据 | Commit / SHA-256 |
| --- | --- |
| 产品候选版本 | `569f7c502fad06790784449e537223c9746e1312` |
| 验证 harness commit | `62b74a91221a261e49a3c05c452e46a9a34da5e5` |
| 原始修复后证据 commit | `57e5809` |
| 原始 held-out 证据 SHA-256 | `7B8E3833A71D60645DF134D8B87ADF49EAA5557EE59A6AB6D64A537C8A3BB5D3` |
| 修复后 harness SHA-256 | `A61BB50908C57FA546A77FE59EE42A2A60FC9BC7E9056B5F896C5672BA608342` |
| 修复后证据 SHA-256 | `320F5C94234F0F7210ABC517422702AF169C052B2FA9138B4A7FF23F7092FA12` |
| 候选 CLI SHA-256 | `7CF0B35BCE86D953A561038B2BA2F339B9B468BFDC685FB87BA128327E35F101` |

Harness 在测量前独立提交，要求 tracked worktree 保持清洁，锁定候选 commit 与 CLI
哈希，验证原始观察文件哈希，逐仓库顺序执行，并用 create-only 方式写入新结果。它无法
覆盖原始第四轮观察。

## 各目标比较

每个目标的两次重复执行都得到完全相同的结果。

| 目标 | 修复前 coverage / focus | 修复后 coverage / focus | 结果 | 主要观察 |
| --- | ---: | ---: | --- | --- |
| Undici | 1.00 / 0.60 | 1.00 / 0.60 | 通过 | 保持稳定；三个 oracle 文件与两个相关 cache 文件。 |
| aiohttp | 1.00 / 0.33 | 0.50 / 0.25 | 失败 | 路线变短却漏掉 `tests/test_helpers.py`，confidence 反升到 0.77。 |
| validator | 0.00 / 0.00 | 1.00 / 0.67 | 通过 | Locale scope 正确选择英文实现与测试。 |
| tracing | 0.00 / 0.00 | 0.00 / 0.00 | 失败 | 仍选择 `tracing`，没有选择任务所属的 `tracing-attributes` crate。 |
| MSW | 0.50 / 0.40 | 0.50 / 0.40 | 失败 | 仍漏掉 `RequestHandler.ts` 与 request-side mock。 |
| Uvicorn | 1.00 / 1.00 | 1.00 / 1.00 | 通过 | 保持精确的实现／测试路线。 |
| GORM | 0.00 / 0.00 | 0.00 / 0.00 | 失败 | 从九个降到七个并移除 workflows，但仍没有命中任何 oracle 文件。 |
| Reqwest | 0.67 / 0.67 | 0.67 / 0.67 | 失败 | 仍用 `src/async_impl/client.rs` 取代 `src/tls.rs`。 |

## 这次修复真正证明了什么

### 得到支持

有限范围的 locale／路径作用域机制，从合成 fixture 成功迁移到 validator。它把完全错误
的路线变成完整路线，并让 focus 高于单目标门槛。

运维元数据过滤也移除了 GORM 的两个 `.github` workflow 文件。它确实减少噪声，但没有
找回因果源码边界，所以只能算部分支持。

### 没有得到支持

1. Workspace ownership 没有迁移到 tracing。公开 `tracing` crate 的词汇证据仍压过真正
   拥有任务的 `tracing-attributes` crate。
2. 因果多文件扩展没有找回 MSW、GORM 或 Reqwest 遗漏的实现兄弟文件。
3. Evidence-sufficient stopping 在 aiohttp 上产生回退：完整实现／测试边界尚未成立，
   就过早裁掉必要测试。
4. Confidence 校准没有改善。仍有六次 overconfident trial，包括 coverage 为零的
   tracing 与 GORM。
5. 六类预期机制中，只有 locale 在真实仓库迁移成功。合成 fixture 是必要的回归检查，
   但不足以证明外部迁移。

## 递归自评

报告与完整性测试完成后，Vertex Palace 对四个实际改动文件进行自评。路线
`route_f592d3d1c6ff94e1` 只命中完整性测试，漏掉两份报告与 `package.json`。
Changed-file coverage 和 route focus 都是 `0.25`；confidence 为 `0.40`，相对于低召回
被归类为 well-calibrated。

路线还选入无关的 shared types 与 failed-route memory 代码。这与跨仓库研究暴露的复合
artifact family 弱点一致。这里选择记录，而不立即针对新报告文件名继续调参；反复用自己的
新报告训练路线，不能建立泛化证据。

## 下一步产品方向

下一候选版本需要改变路由模型，而不是继续调分数阈值：

1. 先建立互相竞争的作用域假设：locale、workspace package／crate、module 与任务所属
   测试树。除非存在跨作用域依赖证据，否则只在胜出的作用域内排序文件。
2. 从锚点沿索引中的 import、call、symbol reference 与 reverse dependency 扩展。
   只有词汇相似不能把文件变成必要因果兄弟。
3. 把实现／测试组合视为证据集合。只有每个明确身份与必要关系都被覆盖，才允许停止。
4. 在 oracle telemetry 中区分 assertion test、mock、fixture 与 helper，同时继续把完整
   changed-file coverage 作为严格报告指标。
5. Confidence 应来自作用域胜出幅度、关系完整度与尚未解决的竞争组合。高词汇分数不能
   弥补 ownership 或实现／测试关系缺失。
6. 根据 tracing、MSW、GORM、Reqwest 与 aiohttp 实际暴露的图结构重建合成 fixture，
   但不得写入仓库名称或目标专用路径。

新候选必须先保持第二轮与第三轮已公开回归，并改善这批第四轮公开任务。之后仍要机械选择
全新的 untouched 仓库池，才能讨论 Agent A/B 或泛化。

## 声明边界

这是已公开任务上的静态路由开发证据。它说明 locale scope 的一项修复成功迁移，也说明
整体修复仍不足。它不能证明 Vertex Palace 节省 Token、缩短时间、减少工具调用，或提高
最终 Agent 任务成功率。
