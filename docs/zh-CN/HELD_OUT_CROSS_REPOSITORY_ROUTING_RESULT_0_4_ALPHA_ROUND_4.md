# Held-out 跨仓库路由结果（0.4 Alpha，第四轮）

## 决定

**失败。候选版本 `efd5327` 不得进入 Agent A/B。**

第一次预注册观察完成了八个仓库与顺序执行的 `16/16` 次 trial，但只有两个目标
通过各自门槛。Macro changed-file coverage 为 `0.521`，macro route focus 与
precision 都是 `0.375`，并出现六次 overconfident。

本轮没有 materialization、index、harness 或其他环境失败，八个目标的两次路线
也全部确定一致。因此这是产品路由失败，不是不完整或被环境截断的研究。

## 冻结证据

| Artifact | Commit / SHA-256 |
| --- | --- |
| 产品候选版本 | `efd53274e42fb8123745f2b8bb09a24e4fa384b7` |
| Selector | `96af578295484831e4a14511baf0e88cb69cc081` |
| Target manifest | `7ccf0c7d668f4a9790186ba4659a76fd4a30813d` |
| Validation harness | `8b8badf3c7e30aa123174a9ebba1ab027705b184` |
| 原始证据 commit | `02dff13605e00a822fe87caf58d171af8807bab0` |
| Manifest SHA-256 | `D6A1DDCDA3BD704D1F809279229153F72B4CF6162F1C1231C40D36F18626F5C0` |
| Harness SHA-256 | `9C768BA266F9421FEF1C9275C7BBB4AB8ED1AE3424D1B333049652A4D17AD5D2` |
| 原始证据 SHA-256 | `7B8E3833A71D60645DF134D8B87ADF49EAA5557EE59A6AB6D64A537C8A3BB5D3` |

- 证据类别：`preregistered-candidate-held-out-static-routing`
- 验证前对已选任务执行的 Palace 调用：`0`
- 测量前是否重新 build 产品：`false`
- 候选 CLI SHA-256：
  `E0A2F54C826E742DF03BA0BC965C89AF834B3BBA199C1E135E63E21B291011D0`

仓库池、顺序、fallback、commit 选择规则、manifest、候选版本、门槛、重试规则与
验证 harness，全部在 Palace 第一次接触已选任务前提交。

## 汇总结果

| 指标 | 结果 | 门槛 |
| --- | ---: | ---: |
| 通过目标 | 2/8 | 8/8 |
| 完成 trials | 16/16 | 16/16 |
| Task-type 匹配目标 | 8/8 | 8/8 |
| Core surface 完整目标 | 3/8 | 8/8 |
| Exact-oracle 目标 | 1/8 | 仅报告 |
| Macro changed-file coverage | 0.521 | >= 0.900 |
| Macro route focus | 0.375 | >= 0.750 |
| Macro route precision | 0.375 | >= 0.750 |
| 最低目标 focus / precision | 0.000 / 0.000 | >= 0.500 / 0.500 |
| Overconfident trials | 6 | 0 |
| 确定路线目标 | 8/8 | 8/8 |
| Oracle 文件 / 首次路线文件 | 24 / 34 | 仅报告 |
| 最大 context | 5,891 | <= 6,000 |
| Environment / harness 失败 | 0 / 0 | 0 / 0 |

候选版本通过任务分类、完整执行、确定性、worktree 清洁和 context 上限检查，但
没有通过任何路线质量晋级门槛。

## 各目标结果

每个目标的两次 repetition 数值完全一致。

| 目标 | 结果 | Coverage | Focus | Precision | Confidence | Calibration | 路线文件 | 主要观察 |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Undici | 通过 | 1.00 | 0.60 | 0.60 | 0.40 | underconfident | 5 | 三个 oracle 文件全部找回，另带两个 cache 文件。 |
| aiohttp | 失败 | 1.00 | 0.33 | 0.333 | 0.72 | underconfident | 6 | 精确 pair 已找回，但多带四个 parser、cookie 与 auth 文件。 |
| validator | 失败 | 0.00 | 0.00 | 0.000 | 0.40 | overconfident | 2 | 选择 root translations 与俄文测试，完全漏掉英文 module pair。 |
| tracing | 失败 | 0.00 | 0.00 | 0.000 | 0.84 | overconfident | 2 | 选择 `tracing` crate，而不是 `tracing-attributes` workspace crate。 |
| MSW | 失败 | 0.50 | 0.40 | 0.400 | 0.40 | well-calibrated | 5 | 找到两个 cookie 实现，但漏掉 `RequestHandler` 与 request mock。 |
| Uvicorn | 通过 | 1.00 | 1.00 | 1.000 | 0.49 | underconfident | 2 | 唯一 exact implementation/test 路线。 |
| GORM | 失败 | 0.00 | 0.00 | 0.000 | 0.40 | overconfident | 9 | 错锚在 clauses 与 workflows，完全漏掉 rows-close 实现和测试。 |
| Reqwest | 失败 | 0.67 | 0.67 | 0.667 | 0.40 | underconfident | 3 | 找到 `connect.rs` 与 `tests/client.rs`，却用 `async_impl/client.rs` 替代 `tls.rs`。 |

## 已经泛化的部分

1. Task classification 泛化到八个未观察任务，包括 Conventional Commit 与自然祈使
   subject。
2. 八个目标的两次路线在顺序和成员上都完全一致。
3. Uvicorn 的局部 implementation/test typo 修复得到 exact route。
4. Undici 较宽的 cache 改动找回全部 oracle，并保持在预注册 focus 门槛以上。
5. 所有 context 都低于 6,000-token 上限。
6. Palace 没有修改目标仓库的 tracked 文件。

这些是有价值的组件结果，但不能抵消整体晋级失败。

## 失败机制

### Locale 与目录范围

`English translations` 没有和 `translations/en/` 建立足够强的绑定。Validator
选择 root translation 与 `translations/ru/ru_test.go`。后续需要有限范围的 locale
alias 与 path-segment identity，而不是仓库专用规则。

### Workspace package 身份

Tracing 同时包含相近的 `tracing` 与 `tracing-attributes` crates。任务中的
`instrument field names` 属于 attribute macro crate，但路线锚定 public tracing
crate。必须联合使用 workspace package boundary、import、macro ownership 与测试
位置证据。

### 多文件因果边界

MSW、GORM 与 Reqwest 都需要多个实现文件。Router 找到局部合理 anchor，却没有
恢复完整因果改动边界：

- MSW 漏掉 request-handler usage 与 request-side mock。
- GORM 漏掉全部 callback 与 finisher 文件，反而填入 clause tests 和两个
  `.github` workflow。
- Reqwest 漏掉明确的 TLS implementation sibling。

仅靠文件文字相似度不够。Import、call、workspace、test 与同一代码身份关系，必须
决定哪些 implementation siblings 是必需的。

### Evidence-sufficient stopping

aiohttp 已经包含 exact implementation/test pair，但四个较弱文件仍留在路线中。
当特定 function identity 与泛化 parser/cookie 概念同时出现时，停止规则仍不可靠。

### 路径噪音

GORM 的源码 bugfix 路线混入
`.github/workflows/invalid_question.yml` 与 `missing_playground.yml`。除非任务明确
要求，非产品 operational metadata 不应进入 focused code route。

### Confidence 校准

Validator、tracing、GORM 两次 repetition 都是零 oracle coverage，confidence 却
分别为 `0.40`、`0.84`、`0.40`。当 locale、workspace 或 implementation/test
关系未解决时，confidence 必须进一步降低。

## Oracle 限制

Oracle 是完整 modified-file Git diff，实现／测试角色来自路径规则。Undici 的
`test/cache-interceptor/utils.js` 与 MSW 的 `request-cookies.mocks.ts` 可能只是
测试支援文件，而不是独立断言文件。本研究也没有运行目标测试。

这个限制可能让完整 changed-file recall 比 Agent 完成任务所需的最小文件更严格；
但它无法解释完全漏掉所有 oracle 的 validator、tracing 与 GORM，也不能作为改变
冻结结果的理由。

## 产品研发方向

第四轮八个任务现在都属于已公开开发数据。后续候选只能加入仓库无关机制：

1. 将 locale alias 与有意义的 path segment 建模为有限范围证据；
2. 在同名 root 竞争前识别 workspace package 与 crate/module ownership；
3. 通过 import、call、共享代码身份与匹配测试扩展 implementation sibling，而不是
   依赖宽泛 lexical similarity；
4. 除非任务明确要求，将 `.github` 等 operational metadata 排除在 focused code
   route 外；
5. 强 implementation/test 边界成立后，若弱候选没有独立任务证据就停止；
6. locale、workspace 或多文件关系未解决时限制 confidence；
7. 把八个新失败加入 disclosed fixtures，同时保护之前所有第二轮、第三轮回归。

修复后只能进行 disclosed regression。开始 Agent A/B 之前，仍须再建立一批机械
选择的 untouched pool；把第四轮重新当 held-out gate 会违反研究规则。

## 声明边界

第四轮是 candidate-held-out 静态路由证据，不是 model-unseen 证据，没有运行目标
测试，也没有测量最终 Agent 正确率、reported Tokens、工具调用或 wall time。

本结果不授权性能、release、npm 或 Agent A/B 声明。
