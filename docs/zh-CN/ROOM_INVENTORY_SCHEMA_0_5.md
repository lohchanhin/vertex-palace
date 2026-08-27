# Room Inventory 房间物件系统 0.5

状态：Phase 0 契约已冻结，生产环境尚未启用物件级路由。

## 目的

Room Inventory 将 function、def、method、class、type、constant、endpoint 和聚焦测试，从依赖行号的抽屉升级为房间里的轻量一级物件。它扩充现有节点图，不建立第二套图，也不会为每个 symbol 生成一个 Markdown 文件。

空间对应关系如下：

| 宫殿位置 | 代码含义 |
| --- | --- |
| 楼层 Floor | interface、implementation、data、verification 等架构层 |
| 房间 Room | 功能、package 或有边界的产品区域 |
| 柜子 Cabinet | 源代码文件 |
| Owner | class、namespace、module 或 object literal |
| 物件 Object | function、def、method、type、constant、endpoint 或 test |
| 连接 Relation | calls、contains、tests、implements、reads 或 writes |

## 现有基础

Vertex Palace 0.4 已经能够解析 `function`、`class`、`interface`、`type`、`const` 和 `method`，也能打包 `full_symbol` 抽屉。Phase 0 不替换现有解析结果，只增加可选 metadata 契约和纯身份生成器，留给后续索引整合。

## 物件 Metadata

`PalaceObjectMetadata` 包含：

- 使用 `objectKind` 和 `qualifiedName` 表示明确身份。
- 可选 owner、可见性与标准化 modifiers。
- 使用 `parser` 和 `parserConfidence` 记录来源与安全边界。
- 身份版本、declaration key、signature shape 与 semantic hash。
- 预留给后续关系阶段的可选 relation confidence。

`ParsedSymbol` 与 `PalaceNode` 上的 metadata 都是可选字段。旧索引和旧客户端在没有这些字段时仍然有效。

## 身份契约

Declaration key 不包含源码行号。它由标准化语言、标准化路径、物件类型、qualified name 与标准化签名形状计算。因此，在 declaration 前面插入无关代码行不会改变 declaration key。

Semantic hash 不包含路径和物件名称。它由语言、物件类型，以及移除前导 declaration signature 后再去掉注释、压缩空白的 implementation body 计算。它只能作为搬迁候选，不能单独证明两个物件相同。未来只有在有限证据范围内出现唯一语义匹配时，才能建立 alias；多个候选必须保持 stale。

Phase 0 只保证冻结 fixture 的行号移动稳定性，尚未宣称生产索引已经能够自动恢复移动或重命名。

## Parser 来源

初始 parser 标签为：

- TypeScript 与 JavaScript 使用 `ts-morph`。
- Python 现有缩进结构解析器使用 `python-structural`。
- Go 与 Rust 现有结构 fallback 使用 `fallback-structural`。
- 无法确定来源时使用 `unknown`。

Confidence 只表示 parser 证据强度，不表示路由一定正确。未来低置信度物件若没有独立证据，不能授权强制停止。

## 兼容边界

Phase 0 必须保持四种 Palace mode、现有 node ID、CLI/MCP 输入、路由顺序和 pack 行为不变。生产 indexer 尚未写入新 metadata，因此本阶段不提升持久化 Palace schema version。

新 identity builder 不会从 `buildNodes` 调用。正式整合必须在后续阶段同时提供迁移与回归证据。

## 储存边界

Room Inventory 将复用现有 node 与 edge 图，不会为每个物件建立单独文件。未来每个物件最多保留 32 条高价值 outgoing relation，并记录溢出统计，避免高连接度工具函数造成图无限膨胀。

## 冻结 Fixture

机器 fixture 契约位于 `packages/core/test/fixtures/room-inventory/contract.json`，SHA-256 为 `e7b62cc10e821f2adedead527fa77dc158be4866f6aab4b3724afef06d9ec460`。

Fixture 覆盖 TypeScript、JavaScript、Python、Go 与 Rust。每个案例必须能被现有 parser 找到，并且在物件前插入无关行后保持相同 declaration key 与 semantic hash。

## 声明边界

本契约只证明兼容词汇和确定性身份基础已经建立，不证明生产物件路由、关系准确率、上下文缩减、Agent 正确率、Token 节省或速度提升。
