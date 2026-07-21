# 分区成本与 Agent 遵循指标（0.4.0-alpha）

状态：这是第三代研究完成后的工程验证，不属于已冻结的 v3 正式结果，也不能单独证明端到端效率提升。

## 为什么增加这些指标

过去只能看到整包 bytes，无法知道成本来自任务说明、路线、记忆还是执行边界；benchmark 也只能看到总工具调用，无法判断 Agent 是否重新打开已经完整交付的源码、无证据越过 Deferred / Excluded 边界，或测试通过后仍继续探索。

## 产品端分区指标

Adaptive Markdown 与 JSON 现在分别记录以下分区的 bytes 与估算 Token：

- task
- mode explanation
- primary、support、deferred、excluded
- memory、guardrails
- required evidence
- do-not、stop condition、conflict summary

UTF-8 bytes 必须满足精确等式：

```text
所有分区 bytes 总和 + serializationOverheadBytes = contextBytes
```

`serializationOverheadBytes` 包含标题、JSON key 与标点、telemetry 自身、recommended execution，以及尚未归入语义分区的序列化结构。estimated tokens 仍是本地确定性估算，不是供应商账单数据。

## Benchmark 端遵循指标

transcript 解析器新增：

- 已完整交付路径被重新打开的次数
- 没有冲突证据却打开 Deferred 路径的次数
- 打开 Excluded 路径的次数
- 第一次编辑前的调用数
- 测试通过后的调用数
- 可判断停止条件满足后的调用数
- 是否批量执行验证
- 重复复述任务的次数

这些属于有顺序的 transcript 启发式证据，只分析路径名称、命令类别、退出状态、失败信号与最终 Git 检查；它不是操作系统级文件访问追踪，不能描述为真实文件读取数。

## 验证边界

回归测试会验证 Markdown / JSON 的精确 bytes 对账，并以合成的有序 transcript 覆盖全部遵循指标。正式 v4 Agent 试验仍必须等待协议、fixture、hidden oracle、计划、冻结闸门与盲测方案完成人工审核。
