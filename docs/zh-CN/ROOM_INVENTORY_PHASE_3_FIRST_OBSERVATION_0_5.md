# Room Inventory 0.5：第三阶段首次观察

状态：未通过冻结开发门槛；本次观察不包含任何修复。

观察时间：2026-08-29T13:55:13.842Z  
候选提交：`0f41dbd4153a56b6edf264e36a745d1e2345dbf0`  
Oracle SHA-256：`f2f06345b16050b54bbdbbab640379cb2b70e02f952645071f57f4df839d8c12`  
原始证据 SHA-256：`cc95cc7ca4a67cac5252feb17d205ff5f46846957de3dc3725e84e8f1f6ed9d2`

## 结果

第一次不可改写的 Phase 3 观察没有通过全部预注册门槛。

| 指标 | 结果 | 门槛 | 状态 |
| --- | ---: | ---: | --- |
| 对象端点解析率 | 1.0000 | 1.00 | 通过 |
| 关系精确率 | 0.7586 | >= 0.95 | 失败 |
| 关系召回率 | 0.8148 | >= 0.80 | 通过 |
| 测试闭合召回率 | 0.8000 | >= 0.80 | 通过 |
| 禁止关系发生率 | 0.0000 | 0 | 通过 |
| 重复索引关系一致率 | 1.0000 | 1.00 | 通过 |
| 单对象最大出边 | 3 | <= 32 | 通过 |
| 默认关闭对象关系 | 0 | 0 | 通过 |

开启后的索引解析了全部 46 个声明端点，并命中 27 条应有关系中的 22 条。没有出现任何禁止的同名误连；两次开启索引产生完全相同的对象关系键集合。

## 各语言召回率

| 语言 | 命中 / 应有 | 召回率 |
| --- | ---: | ---: |
| TypeScript | 6 / 6 | 1.0000 |
| JavaScript | 6 / 6 | 1.0000 |
| Python | 5 / 6 | 0.8333 |
| Go | 5 / 6 | 0.8333 |
| Rust | 0 / 3 | 0.0000 |

Rust 召回率为零，因此单语言门槛失败。

## 漏失关系

一共遗漏 5 条应有关系：

- Python `py_build_session calls py_hash_session`。
- Go `goBuildStore calls goPersistStore`。
- Rust `rust_build_route calls rust_prepare_route`。
- Rust `rust_builds_route tests rust_build_route`。
- Rust `rust_build_route tested_by rust_builds_route`。

## 额外范围内关系

已声明端点之间出现 7 条不在完整 oracle 中的关系：

- TypeScript、JavaScript、Python 各有一条 Owner 到成员的 `calls`，与结构所有权重复。
- Python 测试还双向连接到宽泛 `PySession` Owner。
- Go 测试还双向连接到宽泛 `GoStore` Owner。

这 7 条关系把精确率降到 `0.7586`。冻结歧义控制仍然有效：10 条禁止的 caller 到同名目标关系一条都没有出现。

## 测试对象元数据

TypeScript、JavaScript、Python 测试对象被识别为 `test`；Go 的 `TestGoBuildStore` 和 Rust 的 `rust_builds_route` 仍是普通 `function`。既有文件或 symbol 测试边让 Go 达到了测试闭合真值，但这不代表 Room Inventory 元数据识别已经正确。

## 允许的修复方向

协议允许每个失败类别进行一次通用机制修复。下一步可以研究和修复：

1. 声明或所有权文本被误判为可执行调用。
2. 宽泛 Owner 命中挤占唯一命名实现目标。
3. 结构解析器没有把 Python、Go、Rust 实现正文暴露给调用关系。
4. Go 与 Rust 的标准测试约定没有生成 `test` 对象元数据。

生产逻辑不得加入夹具名称、对象身份、预期路径；本次观察后也不得修改 oracle 或阈值。

## 声明边界

这是一次失败、已披露的合成开发观察，不能证明全新 Round 26 资格、节省 Token、减少工具调用、加快完成或提高端到端 Agent 正确率。
