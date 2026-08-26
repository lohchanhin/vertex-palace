# Round 11 披露后路线聚焦修复结果（0.4 Alpha）

## 声明边界

已经冻结、对候选实现 held-out 的 Round 11 正式结果仍然是 **FAILED**，且不可改写。
上一阶段 owner-closure 修复也仍是一项失败的披露后回归，其宏平均路线聚焦度为
0.567。本次聚焦修复是在八个目标及其多余路线文件都已经被观察之后才完成的。

因此，新结果属于**观察后的回归证据，不是 held-out 泛化证据**。它只测量静态路线
覆盖、聚焦度、确定性、校准、上下文边界与目标工作树清洁度，不能证明 Agent
正确率提高、Token 节省、Agent 工具调用减少或 Agent 执行时间缩短。上述结论仍需
全新且递归排除旧目标的 Round 12，以及之后另行预注册的 Agent 研究。

## 结果

本次披露后聚焦修复在没有下调任何门槛的情况下 **PASSED**：

- 8/8 个目标完成并通过。
- 8/8 个重复路线完全确定一致。
- 8/8 个任务分类与冻结 oracle 一致。
- 8/8 个目标保留完整的实现与测试覆盖。
- 宏平均 changed-file coverage 保持 1.000。
- 宏平均路线聚焦度从 0.567 提升至 0.701。
- 宏平均核心路线聚焦度从 0.546 提升至 0.670。
- 最低目标覆盖率保持 1.000；最低单目标聚焦度为 0.500。
- 最大 adaptive context 为 3,802 estimated tokens，低于未改变的 6,000-token 上限。
- 过度自信、危险窄路线、危险强制停止、指标分歧、evaluate/context 分歧、执行错误和
  目标工作树改动全部为 0。

0.701 只以很小的幅度越过预注册的 0.70 门槛，不能被包装成稳健的外部确认。

## 通用产品改动

路由器中没有加入仓库名、目标名或冻结 oracle 路径的特例。此次修复增加的都是通用
证据规则：

1. 将同一 API 的运行时实现与类型声明视为一个 runtime owner，同时保留类型测试和
   公共入口集成测试。
2. 为普通运行时测试设置有上限的证据预算，不再保留每一个词汇或关系相邻的测试。
3. 继续保留显式复数 regressions、不同的 mock/search 与 utility/integration 验证面、
   跨版本下游影响，以及由聚焦测试共同覆盖的因果兄弟实现。
4. 只有任务明确要求测试配置、runner 配置或直接点名配置文件时，才加入验证配置。
5. 只有在至少存在两个更强实现锚点后，才移除未请求的 package/license metadata 和
   只命中一个弱词的候选。
6. release 路由不使用这些针对普通实现任务的窄化规则，因为发布工作本来就是显式的
   多表面流程。

## 各目标对比

| 目标 | 修复前聚焦度 | 修复后聚焦度 | 修复前文件数 | 修复后文件数 | 核心覆盖率 |
| --- | ---: | ---: | ---: | ---: | ---: |
| yup | 0.400 | 0.500 | 5 | 4 | 1.000 |
| marshmallow | 0.500 | 0.750 | 6 | 4 | 1.000 |
| arrayvec | 0.400 | 0.500 | 10 | 8 | 1.000 |
| node-fetch | 0.800 | 1.000 | 5 | 4 | 1.000 |
| jsonschema | 0.667 | 0.667 | 3 | 3 | 1.000 |
| go-sql-driver/mysql | 0.600 | 0.857 | 10 | 7 | 1.000 |
| itertools | 0.500 | 0.667 | 4 | 3 | 1.000 |
| pgx | 0.667 | 0.667 | 3 | 3 | 1.000 |

修复移除了重复的运行时测试、未请求的验证配置、无关 package/license metadata 和
低信息量测试邻居，同时保留了全部冻结的实现、测试与辅助文件，包括 marshmallow
的 changelog，以及 mysql 与 pgx 所需的因果实现兄弟。

## 工程验证

- Router 回归：93/93 通过。
- Core 套件：14 个测试文件，212/212 通过。
- CLI 与 MCP 套件分别为 2/2、2/2 通过。
- 研究套件：140/140 常规测试与 2/2 Round 11 历史 freeze 测试通过。
- 完整 workspace TypeScript 检查通过。
- 完整 workspace 与生成的 package/plugin bundle 构建成功。
- 10 项已注册 MCP 工具的 smoke test 全部通过。
- 披露后验证器将每个固定提交重新 clone 到全新的临时目录，重建 Palace，并执行两次
  顺序 evaluate/context 重复验证。
- 所有目标仓库保持清洁，所有 context payload 均低于冻结上限。

## 证据完整性

- 目标 manifest SHA-256：
  `3174A480FE83E2B0D140262306C3ACADCA5C6BA0190165B1335C4AC3ED442ECE`
- Round 11 正式结果 SHA-256：
  `570C2AAA0F5A593466F4EAB5161897DADE310EB211ABE1F2647586B872797720`
- Owner-closure Attempt 3 SHA-256：
  `939741A55D47839D970D261F3D4E91BBAF1B190272FFE336150131A64EBD3A2E`
- 聚焦修复验证器 SHA-256：
  `1495AA3D515D6C591AC70972A980F1AE07F3A2D473A67B8F6301CD9EB72BC65B`
- 聚焦修复 Attempt 1 SHA-256：
  `6CC3EC6285324694B967FCCF49C57E263C20784B5DD6C2489512E92E6928F193`

证据文件：

- [冻结的 Round 11 正式结果](../research/evidence/local-blind-routing-validation-0.4-alpha-round-11-attempt-1.json)
- [Owner-closure Attempt 3](../research/evidence/disclosed-routing-round-11-after-owner-closure-repair-attempt-3-0.4-alpha.json)
- [聚焦修复 Attempt 1](../research/evidence/disclosed-routing-round-11-after-focus-repair-attempt-1-0.4-alpha.json)

## 后续研究方向

这次产品修复足以支持冻结一个新候选，但还不足以宣称泛化。Round 12 必须选择全新的
仓库与任务，不得重用 Round 1-11 的任何仓库、issue、任务措辞、ground-truth commit
或已披露失败；目标选择、候选哈希、门槛和停止规则必须在查看结果前冻结。

只有全新 Round 12 通过后，Vertex Palace 才应进入另行预注册的 Agent A/B 研究，测量
正确率、交付上下文、Agent 工具调用、回报 Token 与 wall time。
