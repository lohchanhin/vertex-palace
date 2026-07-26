# 第八轮公开路由修复协议（0.4 Alpha）

## 目的

本协议修复第八轮已经保存的五类静态路由缺陷：SQLAlchemy、Sinon、Rich、
Viper 与 Crossbeam。任务文本和 oracle 文件都已经公开，因此允许在本地反复
研发，但结果只能作为“已知回归修复证据”，不能当作未见测试证据。

修复前基线固定为提交
`7496bef84e49264183cddbc48ce08d5e6665f2eb`，CLI SHA-256 为
`52A1876B00AF4AAA884A6C7EA47AC2E701E88C34FC8FEE65DD1B32BB6513B8AE`。
来源 manifest SHA-256 为
`6678CE22935F938593C9F950636795E3295D18C9AC57D1C1E7A068B145214466`，
第八轮合并分析 SHA-256 为
`3653B738A46690BD51B021D0469D5B3B6F9B1A3E6C23A7EF89A7E430F81442A5`。

## 已知缺陷类型

1. **Sinon，解析器与表面误判：** JavaScript 对象字面量中的行为方法没有进入
   symbol 索引，而文档文件名刚好完整命中任务关键词。
2. **SQLAlchemy，分散式 typing 漏项：** 遗漏共享实现与明确的 typing 测试。
3. **Viper，实现兄弟文件漏项：** 遗漏 `file.go`，而且不完整路线仍进入
   `route-lite`。
4. **Crossbeam，整合测试漏项：** 遗漏 `tests/mpsc.rs`，同时纳入非 oracle 的
   `lib.rs`。
5. **Rich，聚焦不足：** oracle 全部命中，但六个泛用邻居让 focus 降到 `0.25`。

## 固定执行条件

- 沿用第八轮完全相同的任务文本、仓库 URL、route commit 与 oracle 文件。
- 固定 `budget=6000`、`routeLimit=9`、`maxDrawers=4`。
- 每个 condition 执行两次确定性重复。
- 基线与修复候选必须顺序执行，使用独立仓库副本和全新索引，禁止并发。
- 禁止删除或替换目标、改写任务、改写 oracle。
- 失败、部分完成、无效与成功尝试都必须保存。
- 正式保存比较结果前，必须另建执行预注册，锁定修复候选提交与 CLI 哈希。

## 通过门槛

五个目标和每个 condition 的十次 trial 必须全部完成；每个目标的 changed-file
coverage 必须完整；macro coverage 至少 `0.90`；macro focus 与 precision 至少
`0.75`；每个目标的 focus 与 precision 至少 `0.50`。

候选五条路线合计最多 18 个文件；Rich 最多四个文件；Sinon 不得包含任何
`docs/` 文件；路线必须确定；coverage 低于 `0.90` 的目标不得选择 `bypass` 或
`route-lite`。

## 声明边界

即使本公开面板通过，也只能说明五个已知第八轮缺陷得到修复，不能证明未见
任务泛化、Agent 正确率、reported Token 节省、工具调用减少或执行时间下降。
提出泛化结论前，必须另行冻结第九轮仓库池并执行真正的未见验证。
