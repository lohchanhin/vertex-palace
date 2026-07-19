# Adaptive Context Ceiling Incident and Fix for 0.3.0

## Claim boundary

This record validates a Vertex Palace output contract. It does not compare
Adaptive Palace with Control and does not claim lower end-to-end Agent tokens,
tool calls, or wall time. The reported token counts use the product's estimator;
they are not exact model-tokenizer counts.

## What failed

The packer budgeted route summaries, memory text, and source drawers before
rendering the final response. Memory exclusion telemetry and execution
boundaries were added later. The render loop updated its own byte and token
metrics, but it did not reduce an oversized payload.

This produced real contract violations:

- The Vertex Palace repository delivered 6,141 estimated tokens against a
  selected 5,000-token ceiling in one dense-memory task.
- The benchmark repository delivered 7,371 against a selected 6,000-token
  ceiling in another dense-memory task.
- A controlled fixture reproduced the format difference: Markdown fit at
  3,752 / 5,000 while JSON reached 5,502 / 5,000.

Smaller source context was therefore not enough. Audit metadata itself could
make the delivered pack larger than promised.

## Product change

The 0.3.0 candidate now:

1. Ranks and considers at most the top 50 relevant memory candidates.
2. Preserves an inclusion or machine-readable exclusion reason for every
   candidate in that bounded set.
3. Measures the complete serialized Markdown or JSON, including telemetry and
   execution boundaries.
4. Converts the lowest-priority loaded drawer from source content to a summary,
   then moves it to Deferred if another reduction is required.
5. Throws an explicit error if mandatory metadata alone cannot fit, instead of
   returning an over-budget payload.

## Clean-install result

Evidence was generated from repository commit
`cb93369c642135d3d924166bff62b0eaf0cacde1` by packing and installing
`vertex-palace@0.3.0` in a new temporary prefix. The tarball SHA-1 was
`fdce7d81b82cdd61d7558c2b1df0b152ab8249e7`.

| Format | Candidates | Included | Excluded with reasons | Bytes | Estimated tokens | Ceiling | Loaded drawers | Deferred references |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| JSON | 50 | 3 | 47 | 16,151 | 4,038 | 5,000 | 2 | 8 |
| Markdown | 50 | 3 | 47 | 17,891 | 4,473 | 5,000 | Not separately parsed | Not separately parsed |

The reported byte count equaled the actual serialized byte count for both
formats. All 47 excluded candidates used the stable
`selection_limit_reached` reason. The same release candidate also retained 4/4
true-bypass trials, relevant-memory delivery, Aurora historical alias routing,
clean installation, and the ten-tool MCP smoke test.

The [machine-readable package evidence](./evidence/release-candidate-0.3.0.json)
contains the complete result. The independent pinned Zod and Requests gate
continued to report recall 1.000 and strict precision 1.000; see the
[real-repository validation](./REAL_REPOSITORY_VALIDATION_0_3_0.md).

## Remaining limits

- Fifty is a bounded audit set, not an assertion that a repository can have only
  fifty relevant historical entries.
- Estimated tokens remain a portable approximation. Exact model input usage
  still belongs in end-to-end Agent trials.
- The packer can bound what it delivers, but it cannot force an Agent to obey
  Deferred boundaries or stop conditions. The Control-first benchmark must test
  that behavior separately.

---

# 0.3.0 Adaptive Context 上限事故与修复（简体中文）

## 结论边界

这份记录验证 Vertex Palace 的输出契约，不比较 Adaptive Palace 与 Control，
也不宣称端到端 Agent 的总 Token、工具调用或时间已经下降。文中的 Token 数来自
产品估算器，不是特定模型 tokenizer 的精确计费数。

## 发现的问题

旧版 packer 会先用路线摘要、记忆正文和源码抽屉估算预算，随后才加入记忆排除清单和
执行边界。渲染循环虽然会更新自己的 bytes 与 estimated tokens，却不会缩小已经超标的
payload。

真实复现包括：

- Vertex Palace 仓库的一次高密度记忆任务交付 6,141 estimated tokens，超过所选
  5,000 上限。
- Benchmark 仓库的另一次任务交付 7,371，超过所选 6,000 上限。
- 控制 fixture 复现了格式差异：Markdown 为 3,752 / 5,000，JSON 却达到
  5,502 / 5,000。

因此，只减少源码内容还不够；审计 telemetry 本身也可能让最终交付超过承诺。

## 修复方式

0.3.0 候选版现在会：

1. 先排序，只考虑最相关的 50 条记忆候选。
2. 为这个有界候选集中的每一条记忆保留纳入结果或机器可读排除原因。
3. 对包含 telemetry 与执行边界的完整 Markdown 或 JSON 做最终测量。
4. 超标时先把最低优先级源码从完整内容降为摘要，再移到 Deferred。
5. 如果只剩必要 metadata 仍无法容纳，就明确报错，不再交付一个违反上限的 payload。

## 干净安装结果

证据由仓库提交 `cb93369c642135d3d924166bff62b0eaf0cacde1` 生成：先打包
`vertex-palace@0.3.0`，再安装到全新临时目录。Tarball SHA-1 为
`fdce7d81b82cdd61d7558c2b1df0b152ab8249e7`。

| 格式 | 候选 | 纳入 | 有原因的排除 | Bytes | Estimated tokens | 上限 | 已加载抽屉 | Deferred 引用 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| JSON | 50 | 3 | 47 | 16,151 | 4,038 | 5,000 | 2 | 8 |
| Markdown | 50 | 3 | 47 | 17,891 | 4,473 | 5,000 | 未单独解析 | 未单独解析 |

两种格式报告的 bytes 都与真实序列化输出完全相等，47 条排除记录全部使用稳定的
`selection_limit_reached` 原因。同一安装包仍通过 4/4 true bypass、相关记忆交付、
Aurora 历史别名路由、干净安装和 MCP 10 工具 smoke test。

[机器可读安装包证据](./evidence/release-candidate-0.3.0.json)保留完整结果。
固定 Zod 与 Requests 验证也继续保持召回率 1.000、严格精度 1.000，详见
[真实仓库验证](./REAL_REPOSITORY_VALIDATION_0_3_0.md)。

## 仍然存在的限制

- 50 是有界审计集合，不代表项目最多只能有 50 条相关历史记录。
- Estimated tokens 仍是跨环境近似值；精确模型输入必须留给端到端 Agent 实验。
- Packer 可以限制自己交付的内容，但不能强迫 Agent 遵守 Deferred 或 Stop Condition；
  这必须由后续 Control-first benchmark 单独验证。
